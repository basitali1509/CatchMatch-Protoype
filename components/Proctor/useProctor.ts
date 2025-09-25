// 'use client';
// import { useEffect } from 'react';
// import { toastBus } from '../Toaster';

// type CheatType =
//   | 'tab-blur' | 'visibility-hidden' | 'escape-fullscreen'
//   | 'copy' | 'paste' | 'cut' | 'context'
//   | 'devtools' | 'idle' | 'no-face' | 'multi-face';

// const COOLDOWN_MS = 45_000;
// const IDLE_MS = 90_000;

// const gs: { last: Record<CheatType, number>; alerting: boolean; idleTimer?: any } =
//   (globalThis as any).__cm_proctor_gs || ((globalThis as any).__cm_proctor_gs = { last: {} as any, alerting:false });

// function shouldNotify(type: CheatType) {
//   const now = Date.now();
//   const last = gs.last[type] || 0;
//   if (now - last < COOLDOWN_MS) return false;
//   gs.last[type] = now;
//   return true;
// }

// function alertOnce(msg: string) {
//   if (gs.alerting) return;
//   gs.alerting = true;
//   try { window.alert(msg); } catch {}
//   setTimeout(()=>{ gs.alerting = false; }, 400);
// }

// function beacon(attemptId: string, type: CheatType) {
//   try {
//     navigator.sendBeacon?.('/api/proctor/event', JSON.stringify({ attemptId, type, ts: Date.now() }));
//   } catch {}
// }

// export function useProctor(attemptId: string, active: boolean) {
//   useEffect(() => {
//     if (!active) return;

//     const notify = (type: CheatType, msg: string) => {
//       if (!shouldNotify(type)) return;
//       toastBus.push(msg, 'error');
//       alertOnce(msg);
//       beacon(attemptId, type);
//     };

//     // Allow WebcamPresence to call
//     (globalThis as any).__cm_proctor_notify = (t: CheatType, m: string) => notify(t, m);

//     const onBlur = () => notify('tab-blur', 'Tab blur / focus loss detected.');
//     const onVis = () => { if (document.hidden) notify('visibility-hidden','Page hidden.'); };
//     const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') notify('escape-fullscreen','Esc pressed (fullscreen broken).'); };

//     const onCopy = (e: ClipboardEvent) => { e.preventDefault(); notify('copy','Copy blocked.'); };
//     const onPaste = (e: ClipboardEvent) => { e.preventDefault(); notify('paste','Paste blocked.'); };
//     const onCut = (e: ClipboardEvent) => { e.preventDefault(); notify('cut','Cut blocked.'); };
//     const onCtx = (e: MouseEvent) => { e.preventDefault(); notify('context','Right-click disabled.'); };

//     // devtools heuristic: window.outerHeight - innerHeight big or key combos
//     const devtoolsCheck = () => {
//       const open = (window.outerHeight - window.innerHeight) > 200 || (window.outerWidth - window.innerWidth) > 200;
//       if (open) notify('devtools','DevTools likely open.');
//     };
//     const devtoolsInterval = setInterval(devtoolsCheck, 3000);

//     // idle detection
//     const resetIdle = () => {
//       if (gs.idleTimer) clearTimeout(gs.idleTimer);
//       gs.idleTimer = setTimeout(() => notify('idle','Idle for too long.'), IDLE_MS);
//     };
//     ['mousemove','keydown','scroll','click'].forEach(ev=>window.addEventListener(ev, resetIdle));
//     resetIdle();

//     window.addEventListener('blur', onBlur);
//     document.addEventListener('visibilitychange', onVis);
//     window.addEventListener('keydown', onKey);

//     document.addEventListener('copy', onCopy);
//     document.addEventListener('paste', onPaste);
//     document.addEventListener('cut', onCut);
//     document.addEventListener('contextmenu', onCtx);

//     return () => {
//       window.removeEventListener('blur', onBlur);
//       document.removeEventListener('visibilitychange', onVis);
//       window.removeEventListener('keydown', onKey);

//       document.removeEventListener('copy', onCopy);
//       document.removeEventListener('paste', onPaste);
//       document.removeEventListener('cut', onCut);
//       document.removeEventListener('contextmenu', onCtx);

//       clearInterval(devtoolsInterval);
//       ['mousemove','keydown','scroll','click'].forEach(ev=>window.removeEventListener(ev, resetIdle));
//       if (gs.idleTimer) clearTimeout(gs.idleTimer);
//     };
//   }, [attemptId, active]);
// }

'use client';

import { useEffect, useRef } from 'react';
import { toastBus } from '@/components/Toaster';

type Cheat =
  | 'tab-blur'
  | 'visibility-hidden'
  | 'escape-fullscreen'
  | 'no-face'
  | 'looking-away'
  | 'speaking'
  | 'possible-headphones'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'context'
  | 'devtools'
  | 'idle';

const COOLDOWN_MS: Record<Cheat, number> = {
  'tab-blur': 45_000,
  'visibility-hidden': 45_000,
  'escape-fullscreen': 45_000,
  'no-face': 15_000,
  'looking-away': 20_000,
  'speaking': 20_000,
  'possible-headphones': 60_000,
  'copy': 30_000,
  'paste': 30_000,
  'cut': 30_000,
  'context': 30_000,
  'devtools': 60_000,
  'idle': 90_000,
};

const human: Record<Cheat, string> = {
  'tab-blur': 'Proctor: Tab switch / blur detected',
  'visibility-hidden': 'Proctor: Page hidden (visibility change)',
  'escape-fullscreen': 'Proctor: Esc pressed — exited fullscreen',
  'no-face': 'Proctor: Face not detected',
  'looking-away': 'Proctor: Persistent gaze away from screen',
  'speaking': 'Proctor: Speech detected while answering',
  'possible-headphones': 'Proctor: Possible headphones/earbuds detected (ears occluded)',
  'copy': 'Proctor: Copy action blocked',
  'paste': 'Proctor: Paste action blocked',
  'cut': 'Proctor: Cut action blocked',
  'context': 'Proctor: Right-click disabled',
  'devtools': 'Proctor: DevTools likely open',
  'idle': 'Proctor: Idle for too long',
};

export function useProctor(attemptId: string, active: boolean) {
  const lastShownRef = useRef<Record<Cheat, number>>({
    'tab-blur': 0,
    'visibility-hidden': 0,
    'escape-fullscreen': 0,
    'no-face': 0,
    'looking-away': 0,
    'speaking': 0,
    'possible-headphones': 0,
    'copy': 0,
    'paste': 0,
    'cut': 0,
    'context': 0,
    'devtools': 0,
    'idle': 0,
  });

  function notify(type: Cheat) {
    const now = Date.now();
    const last = lastShownRef.current[type] || 0;
    if (now - last < COOLDOWN_MS[type]) return;
    lastShownRef.current[type] = now;

    toastBus.push(human[type], 'error');
    try {
      navigator.sendBeacon?.('/api/proctor/event', JSON.stringify({ attemptId, type, ts: now }));
    } catch {}
  }

  // Allow WebcamPresence to call
  (globalThis as any).__cm_proctor_notify = (type: Cheat) => notify(type);

  useEffect(() => {
    if (!active) return;

    const onBlur = () => notify('tab-blur');
    const onVisibility = () => { if (document.hidden) notify('visibility-hidden'); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') notify('escape-fullscreen'); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault?.(); notify('copy'); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault?.(); notify('paste'); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault?.(); notify('cut'); };
    const onCtx = (e: MouseEvent) => { e.preventDefault?.(); notify('context'); };
    const onKeyDownPaste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault?.();
        notify('paste');
      }
    };

    // devtools heuristic
    const devtoolsCheck = () => {
      const open = (window.outerHeight - window.innerHeight) > 200 || (window.outerWidth - window.innerWidth) > 200;
      if (open) notify('devtools');
    };
    const devtoolsInterval = window.setInterval(devtoolsCheck, 3000);

    // idle detection
    let idleTimer: number | undefined;
    const IDLE_MS = COOLDOWN_MS['idle'];
    const resetIdle = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => notify('idle'), IDLE_MS);
    };
    ['mousemove','keydown','scroll','click'].forEach(ev => window.addEventListener(ev, resetIdle));
    resetIdle();

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);
    document.addEventListener('contextmenu', onCtx);
    window.addEventListener('keydown', onKeyDownPaste);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('keydown', onKeyDownPaste);
      window.clearInterval(devtoolsInterval);
      ['mousemove','keydown','scroll','click'].forEach(ev => window.removeEventListener(ev, resetIdle));
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, [active, attemptId]);
}

