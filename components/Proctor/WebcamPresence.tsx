// 'use client';
// import { useEffect, useRef, useState } from 'react';

// declare global { interface Window { __cm_proctor_notify?: (t:any,m:string)=>void } }

// export default function WebcamPresence({ active, attemptId }:{ active: boolean; attemptId: string }) {
//   const videoRef = useRef<HTMLVideoElement|null>(null);
//   const [ready, setReady] = useState(false);
//   const [detector, setDetector] = useState<any|null>(null);

//   useEffect(() => {
//     let stream: MediaStream|null = null;
//     let raf = 0;
//     let cancelled = false;

//     async function init() {
//       if (!active) return;
//       const v = videoRef.current!;
//       try {
//         // dynamic import so this module is not required during SSR
//         const mod = await import('@mediapipe/tasks-vision');
//         const { FaceDetector, FilesetResolver } = mod as any;

//         stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
//         v.srcObject = stream;
//         await v.play();

//         const fileset = await FilesetResolver.forVisionTasks('/mediapipe/');
//         const det = await FaceDetector.createFromOptions(fileset, {
//           baseOptions: { modelAssetPath: '/mediapipe/face_detection_short_range.task' },
//           runningMode: 'VIDEO',
//           minDetectionConfidence: 0.5
//         });
//         setDetector(det);
//         setReady(true);

//         const loop = () => {
//           if (!det || !v.videoWidth) { raf = requestAnimationFrame(loop); return; }
//           const res = det.detectForVideo(v, performance.now());
//           const faces = res.detections?.length || 0;

//           if (faces === 0) window.__cm_proctor_notify?.('no-face', 'No face visible.');
//           if (faces > 1) window.__cm_proctor_notify?.('multi-face', 'Multiple faces detected.');

//           raf = requestAnimationFrame(loop);
//         };
//         raf = requestAnimationFrame(loop);
//       } catch (err) {
//         console.error('[WebcamPresence] init error', err);
//         window.__cm_proctor_notify?.('no-face', 'Webcam unavailable.');
//       }
//     }

//     init();

//     return () => {
//       if (raf) cancelAnimationFrame(raf);
//       if (stream) stream.getTracks().forEach(t=>t.stop());
//       setReady(false); setDetector(null);
//       cancelled = true;
//     };
//   }, [active]);

//   return (
//     <div className="border rounded-xl p-3 bg-black/5">
//       <div className="text-sm text-slate-600 mb-2">Webcam presence {ready ? '• active' : '• starting…'}</div>
//       <video ref={videoRef} className="rounded-lg w-full max-h-56 bg-black" muted playsInline />
//     </div>
//   );
// }


'use client';

import { useEffect, useRef, useState } from 'react';

// MediaPipe FaceMesh via CDN (lightweight lazy load)
const FACEMESH_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js';
const CAMERA_UTILS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js';

type Cheat =
  | 'no-face'
  | 'looking-away'
  | 'possible-headphones'
  | 'speaking';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export default function WebcamPresence({ attemptId, active }: { attemptId: string; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  // mic analyser
  const audioRef = useRef<{ ctx: AudioContext; source: MediaStreamAudioSourceNode; analyser: AnalyserNode } | null>(null);
  const speakingRef = useRef(false);
  const speakTimerRef = useRef<number | null>(null);

  // gaze/headphone heuristics
  const lastFaceTsRef = useRef<number>(0);
  const noFaceTimerRef = useRef<number | null>(null);
  const lookAwayStartRef = useRef<number | null>(null);
  const occludedStartRef = useRef<number | null>(null);

  async function notify(type: Cheat) {
    try { (globalThis as any).__cm_proctor_notify?.(type); } catch {}
  }

  async function ensureScripts(): Promise<void> {
    const needMesh = !(window as any).FaceMesh;
    const needCam = !(window as any).Camera;
    if (!needMesh && !needCam) return;

    await Promise.all([
      new Promise<void>((res, rej) => {
        if (!needMesh) return res();
        const s = document.createElement('script');
        s.src = FACEMESH_URL;
        s.onload = () => res();
        s.onerror = () => rej(new Error('FaceMesh load failed'));
        document.head.appendChild(s);
      }),
      new Promise<void>((res, rej) => {
        if (!needCam) return res();
        const s = document.createElement('script');
        s.src = CAMERA_UTILS_URL;
        s.onload = () => res();
        s.onerror = () => rej(new Error('Camera utils load failed'));
        document.head.appendChild(s);
      })
    ]);
  }

  async function startVideoAndAudio() {
    // Start video first so the user always sees their feed even if audio fails
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } });
      if (videoRef.current) {
        videoRef.current.srcObject = vStream;
        // don't fail the whole flow if play() is rejected by autoplay policy
        try { await videoRef.current.play(); } catch (err) { /* ignore */ }
      }
      setReady(true);

      // Then try to enable audio/mic analysis; non-fatal if it fails or is blocked
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const src = ctx.createMediaStreamSource(aStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          src.connect(analyser);
          audioRef.current = { ctx, source: src, analyser };
        } catch (err) {
          // audio context creation failed; continue without mic analysis
          console.warn('[WebcamPresence] audio analysis unavailable', err);
          try { aStream.getTracks().forEach(t => t.stop()); } catch {}
        }
      } catch (err) {
        // user denied mic or no mic available; that's okay — we still show video
        console.warn('[WebcamPresence] microphone unavailable or blocked', err);
      }
    } catch (err) {
      // video failed — bubble up so caller can show toast
      throw err;
    }
  }

  function stopMedia() {
    try {
      const v = videoRef.current;
      const ms = v?.srcObject as MediaStream | null;
      ms?.getTracks().forEach(t => t.stop());
      v && (v.srcObject = null);
    } catch {}
    try {
      audioRef.current?.ctx?.close();
      audioRef.current = null;
    } catch {}
  }

  // expose a safe global stop hook so other components can explicitly stop media
  // (used when exam submits to synchronously tear down camera/mic)
  useEffect(() => {
    (globalThis as any).__cm_proctor_stop = () => stopMedia();
    return () => { try { delete (globalThis as any).__cm_proctor_stop; } catch {} };
  }, []);

  // speaking detection loop
  function tickMic() {
    if (!active || !audioRef.current) return;
    const { analyser } = audioRef.current;
    const arr = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(arr);
    // simple RMS
    let sum = 0;
    for (let i=0;i<arr.length;i++){ const v = (arr[i]-128)/128; sum += v*v; }
    const rms = Math.sqrt(sum / arr.length);

    const talking = rms > 0.06; // tuned threshold
    if (talking) {
      if (!speakingRef.current) {
        speakingRef.current = true;
        speakTimerRef.current && window.clearTimeout(speakTimerRef.current);
        speakTimerRef.current = window.setTimeout(() => {
          // sustained speech ~1.5s
          notify('speaking');
          speakingRef.current = false;
        }, 1500);
      }
    } else {
      speakingRef.current = false;
      if (speakTimerRef.current) { window.clearTimeout(speakTimerRef.current); speakTimerRef.current = null; }
    }

    requestAnimationFrame(tickMic);
  }

  // FaceMesh pipeline
  async function startFaceMesh() {
    const FaceMesh = (window as any).FaceMesh;
    const Camera = (window as any).Camera;

    const mesh = new FaceMesh({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}`
    });
    mesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    mesh.onResults((res: any) => {
      if (!active) return;
      const faces = res.multiFaceLandmarks || [];
      const now = Date.now();

      if (!faces.length) {
        // notify immediately that face is not visible (real-time feedback); the proctor
        // hook will rate-limit repeated alerts using its cooldown map.
        notify('no-face');
        return;
      }

      // reset any no-face timer
      if (noFaceTimerRef.current) { window.clearTimeout(noFaceTimerRef.current); noFaceTimerRef.current = null; }
      lastFaceTsRef.current = now;

      const lm = faces[0]; // use primary
      // Use a couple of coarse heuristics:
      // 1) "Looking away": compare eye corners vs nose to estimate yaw/pitch
      //    We'll use landmark indexes: 33 (right eye outer), 263 (left eye outer), 1 (nose tip)
      const eyeR = lm[33], eyeL = lm[263], nose = lm[1];
      if (eyeR && eyeL && nose) {
        const dx = Math.abs((eyeR.x + eyeL.x)/2 - nose.x);
        const dy = Math.abs((eyeR.y + eyeL.y)/2 - nose.y);
        const offCenter = dx > 0.05 || dy > 0.05; // tuned
        if (offCenter) {
          // notify immediately for gaze-off; keep timing window to avoid repeats
          notify('looking-away');
        } else {
          lookAwayStartRef.current = null;
        }
      }

      // 2) "Possible headphones": check ear landmarks visibility/occlusion roughly
      //    Use 234 (left ear), 454 (right ear) — if z depth far or not visible long, warn.
      const earL = lm[234], earR = lm[454];
      const occluded = (!earL || !earR);
      if (occluded) {
        // immediate feedback about possible occlusion
        notify('possible-headphones');
      } else {
        occludedStartRef.current = null;
      }
    });

    const videoEl = videoRef.current!;
    const cam = new Camera(videoEl, {
      onFrame: async () => { await mesh.send({ image: videoEl }); },
      width: 640, height: 360
    });
    cam.start();
  }

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureScripts();
        await startVideoAndAudio();
        if (!cancelled) {
          tickMic();
          await startFaceMesh();
        }
      } catch {
        // Surface a single toast; the preflight page should have prevented this already.
        try { (globalThis as any).__cm_proctor_notify?.('no-face'); } catch {}
      }
    })();

    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [active, attemptId]);

  return (
    <div className="card">
      <div className="card-title">Webcam Presence</div>
      <div className="mt-3">
        <video ref={videoRef} muted playsInline className="w-full rounded-lg bg-black" />
        {!ready && <p className="text-xs text-slate-500 mt-2">Activating camera & mic…</p>}
      </div>
    </div>
  );
}
