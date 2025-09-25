// 'use client';

// import { useEffect, useRef, useState, useMemo } from 'react';
// import { useRouter } from 'next/navigation';

// type Level = 'junior'|'mid'|'senior'|'architect';
// type GeneratedTest = {
//   questions: any[];
//   policy?: {
//     passingScore?: number;
//     weights?: { mcq?: number; fr?: number };
//     timeLimitSec?: number; // seconds
//   };
// };

// const DEFAULT_POLICY = {
//   passingScore: 75,
//   weights: { mcq: 0.5, fr: 0.5 },
//   timeLimitSec: 30 * 60, // 30 minutes
// };

// // Voice activity gate (tuned to ignore fan/AC hum but catch normal speaking)
// const VOICE_RMS_GATE = 0.08;      // ~8% normalized amplitude
// const VOICE_HOLD_MS   = 400;      // sustained > gate to count as "voice"
// const MIC_MIN_DB      = 0.01;     // minimum tiny signal to consider mic alive

// export default function Preflight() {
//   const router = useRouter();

//   // Controls
//   const [level, setLevel] = useState<Level>('mid');

//   // Generated test (loaded in background)
//   const [test, setTest] = useState<GeneratedTest | null>(null);
//   const [loadingTest, setLoadingTest] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   // Preflight flags
//   const [camOk, setCamOk] = useState(false);
//   const [micOk, setMicOk] = useState(false);           // now: true when stream acquired
//   const [faceOk, setFaceOk] = useState(false);
//   const [noHeadphonesConfirmed, setNoHeadphonesConfirmed] = useState(false);

//   // Non-blocking voice indicator
//   const [voiceDetected, setVoiceDetected] = useState(false);

//   // Media & meter
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const audioCtxRef = useRef<AudioContext | null>(null);
//   const analyserRef = useRef<AnalyserNode | null>(null);
//   const lastAboveGateRef = useRef<number>(0);
//   const meterRef = useRef<number>(0);

//   // Show rubric immediately from defaults; override when test arrives
//   const rubric = useMemo(() => {
//     const policy = test?.policy || DEFAULT_POLICY;
//     const pass = policy.passingScore ?? DEFAULT_POLICY.passingScore;
//     const wMcq = Math.round(((policy.weights?.mcq ?? DEFAULT_POLICY.weights.mcq) * 100));
//     const wFr  = Math.round(((policy.weights?.fr  ?? DEFAULT_POLICY.weights.fr)  * 100));
//     const tlMin = Math.round(((policy.timeLimitSec ?? DEFAULT_POLICY.timeLimitSec) / 60));
//     return { pass, wMcq, wFr, tlMin };
//   }, [test]);

//   // Generate test in background; rubric renders immediately with defaults
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         setLoadingTest(true);
//         setErrorMsg(null);
//         const res = await fetch('/api/test/generate', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ level }),
//           cache: 'no-store',
//         });
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const j = await res.json();
//         if (!cancelled) setTest(j);
//       } catch (e: any) {
//         if (!cancelled) {
//           setTest(null); // keep defaults
//           setErrorMsg('Could not fetch generated test; using default rubric until it loads.');
//         }
//       } finally {
//         if (!cancelled) setLoadingTest(false);
//       }
//     })();
//     return () => { cancelled = true; };
//   }, [level]);

//   async function requestCameraAndMic() {
//   try {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: { facingMode: 'user' },
//       audio: { echoCancellation: true, noiseSuppression: true }
//     });

//     // show camera
//     if (videoRef.current) {
//       // @ts-ignore
//       videoRef.current.srcObject = stream;
//       await videoRef.current.play().catch(() => {});
//     }
//     setCamOk(true);

//     // mic presence (not “speaking” detection here — just ensure audio flows)
//     const track = stream.getAudioTracks()[0];
//     if (track) setMicOk(true);

//     // optional: light-weight RMS meter (don’t fail if blocked)
//     try {
//       const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
//       const ctx: AudioContext = new Ctx();
//       audioCtxRef.current = ctx;
//       await ctx.resume().catch(() => {});
//       const src = ctx.createMediaStreamSource(stream);
//       const analyser = ctx.createAnalyser();
//       analyser.fftSize = 512;
//       src.connect(analyser);

//       const arr = new Uint8Array(analyser.frequencyBinCount);
//       const loop = () => {
//         analyser.getByteTimeDomainData(arr);
//         let sum = 0;
//         for (let i = 0; i < arr.length; i++) {
//           const v = (arr[i] - 128) / 128;
//           sum += v * v;
//         }
//         const rms = Math.sqrt(sum / arr.length);
//         meterRef.current = rms;
//         // mark mic OK if any signal at all (don’t require talking)
//         if (!micOk && rms > 0.002) setMicOk(true);
//         requestAnimationFrame(loop);
//       };
//       loop();
//     } catch {
//       // ignore — don’t block preflight
//     }

//     // basic face presence if available
//     const FaceDetector = (window as any).FaceDetector;
//     if (FaceDetector && videoRef.current) {
//       try {
//         const fd = new FaceDetector();
//         const faces = await fd.detect(videoRef.current);
//         setFaceOk(Array.isArray(faces) && faces.length > 0);
//       } catch {
//         setFaceOk(true); // don’t block if detector fails
//       }
//     } else {
//       setFaceOk(true);
//     }
//   } catch {
//     setCamOk(false);
//     setMicOk(false);
//     setFaceOk(false);
//     setErrorMsg('Please allow camera & microphone to continue.');
//     setTimeout(() => setErrorMsg(null), 4500);
//   }
// }


//   async function startExam() {
//   if (!test) { setErrorMsg('Test not ready yet.'); return; }
//   if (!camOk || !micOk || !faceOk || !noHeadphonesConfirmed) {
//     setErrorMsg('Complete all preflight checks first.'); return;
//   }
//   const rsp = await fetch('/api/test/start', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ test })
//   });
//   const j = await rsp.json();
//   if (!j?.attemptId) { setErrorMsg('Could not start exam.'); return; }
//   // navigate to the exam page that will GET /api/test/attempt/[id]
//   router.push(`/exam/${j.attemptId}`);
// }

//   const micPercent = useMemo(
//     () => Math.min(100, Math.max(0, Math.floor((meterRef.current || 0) * 100))),
//     [meterRef.current]
//   );

//   return (
//     <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_100%_-10%,rgba(83,120,255,.25),transparent),radial-gradient(1200px_600px_at_-10%_10%,rgba(214,107,255,.18),transparent)]">
//       <div className="mx-auto max-w-7xl px-6 py-10">
//         {/* Top bar */}
//         <div className="mb-8 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow" />
//             <span className="font-semibold text-slate-900">CatchMatch</span>
//             <span aria-hidden className="mx-3 h-4 w-px bg-slate-300" />
//             <span className="text-sm text-slate-600">Preflight Checks</span>
//           </div>
//           <a href="/" className="text-sm text-slate-600 hover:text-slate-900">Back to home</a>
//         </div>

//         <div className="grid lg:grid-cols-3 gap-6">
//           {/* Left: Checklist & Rubric */}
//           <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
//             <div className="flex items-center justify-between">
//               <h1 className="text-xl font-semibold text-slate-900">Get ready</h1>
//               <div className="flex items-center gap-3">
//                 <label className="text-sm text-slate-600">Level</label>
//                 <select
//                   className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
//                   value={level}
//                   onChange={e => setLevel(e.target.value as Level)}
//                 >
//                   <option value="junior">Junior</option>
//                   <option value="mid">Mid</option>
//                   <option value="senior">Senior</option>
//                   <option value="architect">Architect</option>
//                 </select>
//               </div>
//             </div>

//             {/* Status note (we don’t block rubric on loading anymore) */}
//             <div className="mt-3">
//               {loadingTest && (
//                 <div className="text-xs text-slate-500">Preparing an adaptive test in the background…</div>
//               )}
//               {!loadingTest && errorMsg && (
//                 <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mt-2">
//                   {errorMsg}
//                 </div>
//               )}
//             </div>

//             {/* Rubric & Policy — renders immediately with defaults */}
//             <div className="mt-6">
//               <h2 className="text-sm font-semibold tracking-wide text-slate-700">Rubric & Policy</h2>
//               <div className="mt-3 grid md:grid-cols-3 gap-3">
//                 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
//                   <div className="text-xs text-slate-600">Passing score</div>
//                   <div className="text-lg font-semibold text-slate-900">{rubric.pass}</div>
//                 </div>
//                 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
//                   <div className="text-xs text-slate-600">Weights</div>
//                   <div className="text-sm text-slate-900">
//                     MCQ {rubric.wMcq}% · FR {rubric.wFr}%
//                   </div>
//                 </div>
//                 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
//                   <div className="text-xs text-slate-600">Time limit</div>
//                   <div className="text-lg font-semibold text-slate-900">{rubric.tlMin} min</div>
//                 </div>
//               </div>

//               <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
//                 <b className="text-slate-900">We assess</b>
//                 <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-slate-700">
//                   <li>Core CS: algorithms, complexity, data structures, concurrency semantics.</li>
//                   <li>Systems: HTTP/REST, SQL/indexing, caching & consistency tradeoffs.</li>
//                   <li>Design: scalability, reliability, observability, cost/perf constraints.</li>
//                   <li>Debugging: reasoning from logs/symptoms to safe mitigation.</li>
//                 </ul>
//                 <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
//                   By starting, you consent to webcam/microphone recording, incident logging (blur/visibility, fullscreen exit, clipboard/devtools, idle), and data processing per our policy.
//                 </div>
//               </div>
//             </div>

//             {/* Checklist */}
//             <div className="mt-6">
//               <h2 className="text-sm font-semibold tracking-wide text-slate-700">Preflight checklist</h2>
//               <div className="mt-3 grid sm:grid-cols-2 gap-3">
//                 <div className="rounded-xl border border-slate-200 p-4">
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm text-slate-700">Camera enabled</span>
//                     <span className={`inline-flex h-2.5 w-2.5 rounded-full ${camOk ? 'bg-green-500' : 'bg-slate-300'}`} />
//                   </div>
//                   <p className="mt-2 text-xs text-slate-600">Make sure your face is clearly visible.</p>
//                 </div>
//                 <div className="rounded-xl border border-slate-200 p-4">
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm text-slate-700">Microphone active</span>
//                     <span className={`inline-flex h-2.5 w-2.5 rounded-full ${micOk ? 'bg-green-500' : 'bg-slate-300'}`} />
//                   </div>
//                   <p className="mt-2 text-xs text-slate-600">
//                     We won’t block for background noise. Speaking during the exam is flagged by proctoring.
//                   </p>
//                   {voiceDetected && (
//                     <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
//                       Voice detected — please remain quiet during the exam.
//                     </div>
//                   )}
//                 </div>
//                 <div className="rounded-xl border border-slate-200 p-4">
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm text-slate-700">Face detected</span>
//                     <span className={`inline-flex h-2.5 w-2.5 rounded-full ${faceOk ? 'bg-green-500' : 'bg-slate-300'}`} />
//                   </div>
//                   <p className="mt-2 text-xs text-slate-600">A basic presence check to help you frame correctly.</p>
//                 </div>
//                 <div className="rounded-xl border border-slate-200 p-4">
//                   <label className="flex items-center justify-between">
//                     <span className="text-sm text-slate-700">No headphones/earbuds</span>
//                     <input
//                       type="checkbox"
//                       className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0"
//                       checked={noHeadphonesConfirmed}
//                       onChange={e => setNoHeadphonesConfirmed(e.target.checked)}
//                     />
//                   </label>
//                   <p className="mt-2 text-xs text-slate-600">This reduces collusion risk.</p>
//                 </div>
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="mt-6 flex flex-wrap items-center gap-3">
//               <button
//                 onClick={requestCameraAndMic}
//                 className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
//               >
//                 Enable camera & mic
//               </button>
//               <button
//                 onClick={startExam}
//                 className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
//                 disabled={!camOk || !micOk || !faceOk || !noHeadphonesConfirmed}
//               >
//                 Begin Exam
//               </button>
//               <a href="/" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
//                 Cancel
//               </a>
//             </div>
//           </section>

//           {/* Right: Live preview card */}
//           <aside className="rounded-2xl border border-slate-200 bg-white p-6">
//             <h2 className="text-sm font-semibold tracking-wide text-slate-700">Live preview</h2>
//             <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
//               <video ref={videoRef} muted playsInline className="w-full aspect-video" />
//             </div>
//             <div className="mt-4">
//               <div className="flex items-center justify-between text-xs text-slate-600">
//                 <span>Mic level</span>
//                 <span>{String(micPercent).padStart(2, '0')}%</span>
//               </div>
//               <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
//                 <div
//                   className="h-2 rounded-full transition-all"
//                   style={{
//                     width: `${micPercent}%`,
//                     backgroundColor: voiceDetected ? '#f59e0b' : '#22c55e', // amber if voice, green otherwise
//                   }}
//                 />
//               </div>
//             </div>

//             <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
//               <b className="text-slate-800">Privacy:</b> Video/audio is recorded only during the exam. Signals like
//               tab switches or devtools are logged to protect integrity.
//             </div>

//             {errorMsg && (
//               <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
//                 {errorMsg}
//               </div>
//             )}
//           </aside>
//         </div>
//       </div>
//     </main>
//   );
// }


'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Level = 'junior'|'mid'|'senior'|'architect';
type GeneratedTest = {
  level?: Level;
  questions: any[];
  policy?: { passingScore?: number; weights?: { mcq?: number; fr?: number }; timeLimitSec?: number; };
};

const DEFAULT_POLICY = { passingScore: 75, weights: { mcq: 0.5, fr: 0.5 }, timeLimitSec: 45*60 };

export default function Preflight() {
  const router = useRouter();
  const [level, setLevel] = useState<Level>('mid');
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // checks
  const [camOk, setCamOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [faceOk, setFaceOk] = useState(false);
  const [noHeadphonesConfirmed, setNoHeadphonesConfirmed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterRef = useRef<number>(0);

  // rubric always available
  const rubric = useMemo(() => {
    const p = test?.policy || DEFAULT_POLICY;
    return {
      pass: p.passingScore ?? DEFAULT_POLICY.passingScore,
      wMcq: Math.round(((p.weights?.mcq ?? DEFAULT_POLICY.weights.mcq) * 100)),
      wFr:  Math.round(((p.weights?.fr  ?? DEFAULT_POLICY.weights.fr ) * 100)),
      tlMin: Math.round(((p.timeLimitSec ?? DEFAULT_POLICY.timeLimitSec) / 60)),
    };
  }, [test]);

  // generate test in background
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTest(true);
        setErrorMsg(null);
        const res = await fetch('/api/test/generate', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ level }),
          cache: 'no-store'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) setTest(j);
      } catch (e:any) {
        if (!cancelled) setErrorMsg('Using default rubric while test is prepared.');
      } finally {
        if (!cancelled) setLoadingTest(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level]);

  async function requestCameraAndMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      if (videoRef.current) {
        // @ts-ignore
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(()=>{});
      }
      setCamOk(true);

      // mic present if track exists
      const track = stream.getAudioTracks()[0];
      setMicOk(!!track);

      // best-effort meter (non-blocking)
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new Ctx();
        audioCtxRef.current = ctx;
        await ctx.resume().catch(()=>{});
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analyserRef.current = analyser;

        const arr = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteTimeDomainData(arr);
          let sum = 0;
          for (let i=0;i<arr.length;i++) { const v = (arr[i]-128)/128; sum += v*v; }
          meterRef.current = Math.sqrt(sum/arr.length);
          requestAnimationFrame(loop);
        };
        loop();
      } catch {}

      // face presence (non-blocking)
      const FaceDetector = (window as any).FaceDetector;
      if (FaceDetector && videoRef.current) {
        try {
          const fd = new FaceDetector();
          const faces = await fd.detect(videoRef.current);
          setFaceOk(Array.isArray(faces) && faces.length > 0);
        } catch { setFaceOk(true); }
      } else {
        setFaceOk(true);
      }

    } catch {
      setCamOk(false); setMicOk(false); setFaceOk(false);
      setErrorMsg('Please allow camera & microphone to continue.');
      setTimeout(()=> setErrorMsg(null), 3500);
    }
  }

  async function startExam() {
    if (!test) { setErrorMsg('Test not ready yet.'); return; }
    if (!camOk || !micOk || !faceOk || !noHeadphonesConfirmed) {
      // try to request camera/mic once to help with permission flow
      try {
        await requestCameraAndMic();
      } catch {
        setErrorMsg('Complete all preflight checks first.');
        return;
      }
      if (!camOk || !micOk || !faceOk || !noHeadphonesConfirmed) {
        setErrorMsg('Complete all preflight checks first.'); return;
      }
    }
    const rsp = await fetch('/api/test/start', {
      method:'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ test })
    });
    const j = await rsp.json();
    if (!j?.attemptId) { setErrorMsg('Could not start exam.'); return; }
    router.push(`/exam/${j.attemptId}`);
  }

  const micPercent = useMemo(() =>
    Math.min(100, Math.max(0, Math.floor((meterRef.current || 0) * 100))), [meterRef.current]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_100%_-10%,rgba(83,120,255,.25),transparent),radial-gradient(1200px_600px_at_-10%_10%,rgba(214,107,255,.18),transparent)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
  <img
    src="/logo.svg"
    alt="CatchMatch logo"
    className="h-9 w-auto"
  />
  <span className="text-lg font-semibold tracking-tight">CatchMatch</span>
</div>

            <span aria-hidden className="mx-3 h-4 w-px bg-slate-300" />
            <span className="text-sm text-slate-600">Preflight Checks</span>
          </div>
          <a href="/" className="text-sm text-slate-600 hover:text-slate-900">Back to home</a>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-slate-900">Get ready</h1>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">Level</label>
                <select
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={level}
                  onChange={e => setLevel(e.target.value as Level)}
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="architect">Architect</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              {loadingTest && <div className="text-xs text-slate-500">Preparing your adaptive test…</div>}
              {!loadingTest && errorMsg && (
                <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mt-2">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700">Rubric & Policy</h2>
              <div className="mt-3 grid md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-600">Passing score</div>
                  <div className="text-lg font-semibold text-slate-900">{rubric.pass}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-600">Weights</div>
                  <div className="text-sm text-slate-900">MCQ {rubric.wMcq}% · FR {rubric.wFr}%</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-600">Time limit</div>
                  <div className="text-lg font-semibold text-slate-900">{45} min</div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
                <b className="text-slate-900">We assess</b>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-slate-700">
                  <li>Core CS: algorithms, complexity, data structures, concurrency semantics.</li>
                  <li>Systems: HTTP/REST, SQL/indexing, caching & consistency tradeoffs.</li>
                  <li>Design: scalability, reliability, observability, cost/perf constraints.</li>
                  <li>Debugging: reasoning from logs/symptoms to safe mitigation.</li>
                </ul>
                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                  By starting, you consent to webcam/microphone recording and incident logging (blur/visibility, fullscreen exit, devtools).
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700">Preflight checklist</h2>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Camera enabled</span>
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${camOk ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Make sure your face is visible.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Microphone active</span>
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${micOk ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">We don’t require speaking — just ensure it’s enabled.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Face detected</span>
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${faceOk ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Basic presence check only.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">No headphones/earbuds</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-0"
                      checked={noHeadphonesConfirmed}
                      onChange={e => setNoHeadphonesConfirmed(e.target.checked)}
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-600">Reduces collusion risk.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={requestCameraAndMic}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
                Enable camera & mic
              </button>
              <button onClick={startExam}
                disabled={!camOk || !micOk || !faceOk || !noHeadphonesConfirmed || !test}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                Begin Exam
              </button>
              <a href="/" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                Cancel
              </a>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold tracking-wide text-slate-700">Live preview</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
              <video ref={videoRef} muted playsInline className="w-full aspect-video" />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Mic level</span>
                <span>{String(Math.min(100, Math.max(0, Math.floor((meterRef.current || 0) * 100))))}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, Math.floor((meterRef.current || 0) * 100)))}%` }} />
              </div>
            </div>
            {errorMsg && (
              <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {errorMsg}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
