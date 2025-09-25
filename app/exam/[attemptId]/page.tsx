// 'use client';
// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Toaster, { toastBus } from '@/components/Toaster';
// import { useProctor } from '@/components/Proctor/useProctor';
// import WebcamPresence from '@/components/Proctor/WebcamPresence';
// import type { Question, Answer, MCQSingle, MCQMulti, FreeResponse, AnswerSingle, AnswerMulti, AnswerFR } from '@/lib/schema';

// export default function ExamPage({ params }:{ params:{ attemptId: string }}) {
//   const router = useRouter();
//   const attemptId = params.attemptId;

//   const [test, setTest] = useState<any>(null);
//   const [answers, setAnswers] = useState<Answer[]>([]);
//   const [proctorOn, setProctorOn] = useState(false);

//   // Load test stored in-memory by attemptId
//   useEffect(() => {
//     (async () => {
//       const res = await fetch('/api/test/start', {
//         method:'POST',
//         headers:{'Content-Type':'application/json'},
//         body: JSON.stringify({ getByAttemptId: attemptId })
//       });
//       const j = await res.json().catch(()=>null);
//       if (!j?.test) {
//         toastBus.push('Could not load exam. Start again from Apply.', 'error');
//         return;
//       }
//       setTest(j.test);
//       // Initialize answers
//       const init: Answer[] = j.test.questions.map((q: Question) => {
//         if (q.type === 'mcq-single') return { id: q.id, type: 'mcq-single', choice: null } as AnswerSingle;
//         if (q.type === 'mcq-multi')  return { id: q.id, type: 'mcq-multi',  choices: [] } as AnswerMulti;
//         return { id: q.id, type: 'fr', text: '' } as AnswerFR;
//       });
//       setAnswers(init);

//       // Enter fullscreen then start proctor
//       try { await document.documentElement.requestFullscreen?.(); } catch {}
//       setProctorOn(true);
//     })();
//   }, [attemptId]);

//   // Helpers to mutate answers
//   function setSingle(qid: string, idx: number|null) {
//     setAnswers(prev => prev.map(a => a.id === qid ? ({ ...a, choice: idx }) as AnswerSingle : a));
//   }
//   function clearSingle(qid: string) {
//     setSingle(qid, null);
//   }
//   function toggleMulti(qid: string, idx: number) {
//     setAnswers(prev => prev.map(a => {
//       if (a.id !== qid) return a;
//       const arr = new Set<number>((a as AnswerMulti).choices || []);
//       if (arr.has(idx)) arr.delete(idx); else arr.add(idx);
//       return { ...a, choices: Array.from(arr).sort((x,y)=>x-y) } as AnswerMulti;
//     }));
//   }
//   function setFR(qid: string, text: string) {
//     setAnswers(prev => prev.map(a => a.id === qid ? ({ ...a, text }) as AnswerFR : a));
//   }

//   async function submit() {
//     if (!test) return;
//     setSubmitting(true);
//     setProctorOn(false);
//     try { await document.exitFullscreen?.(); } catch {}
//     try {
//       const res = await fetch('/api/test/grade', {
//         method:'POST',
//         headers:{'Content-Type':'application/json'},
//         body: JSON.stringify({ attemptId, answers })
//       });
//       const j = await res.json();
//       if (typeof j.score === 'number') {
//         toastBus.push(j.passed ? `Passed (${j.score})` : `Failed (${j.score})`, j.passed ? 'success' : 'error');
//         setTimeout(()=> router.push(`/results/${attemptId}`), 900);
//       } else {
//         toastBus.push('Grading failed.', 'error');
//       }
//     } catch {
//       toastBus.push('Network error during grade.', 'error');
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   if (!test) {
//     return (
//       <main className="max-w-5xl mx-auto py-10 px-6">
//         <Toaster />
//         <div className="card">Loading exam…</div>
//       </main>
//     );
//   }

//   return (
//     <main className="max-w-6xl mx-auto py-10 px-6 space-y-6">
//       <Toaster />
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="h1">Proctored Exam</h1>
//           <p className="text-sm text-slate-600">Stay in fullscreen. Proctoring is active.</p>
//         </div>
//         <button className="btn-secondary" onClick={()=>location.href='/apply'}>Exit</button>
//       </div>

//       <div className="grid lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-2 card space-y-5">
//           <h2 className="font-semibold">Questions</h2>

//           {test.questions.map((q: Question) => (
//             <div key={q.id} className="border rounded-xl p-4">
//               <p className="text-sm mb-3">
//                 <b>
//                   {q.type === 'mcq-single' ? 'Single choice' :
//                    q.type === 'mcq-multi'  ? 'Multi select' :
//                    (q.subtype ? `Free response · ${q.subtype}` : 'Free response')}
//                 </b>
//                 {q.difficulty ? <span className="ml-2 text-xs text-slate-500">difficulty {q.difficulty}</span> : null}
//                 <br/>{q.q}
//               </p>

//               {q.type === 'mcq-single' && (
//                 <div className="space-y-2">
//                   {(q as MCQSingle).options.map((opt, i) => {
//                     const ans = answers.find(a => a.id === q.id) as AnswerSingle;
//                     const checked = ans?.choice === i;
//                     return (
//                       <label key={i} className="flex items-center gap-2">
//                         <input
//                           type="radio"
//                           name={q.id}
//                           checked={checked}
//                           onChange={() => setSingle(q.id, i)}
//                         />
//                         <span className="text-sm">{opt}</span>
//                         {checked && (
//                           <button type="button" className="ml-3 text-xs text-slate-600 underline"
//                             onClick={() => clearSingle(q.id)}>clear</button>
//                         )}
//                       </label>
//                     );
//                   })}
//                 </div>
//               )}

//               {q.type === 'mcq-multi' && (
//                 <div className="space-y-2">
//                   {(q as MCQMulti).options.map((opt, i) => {
//                     const ans = answers.find(a => a.id === q.id) as AnswerMulti;
//                     const checked = !!ans?.choices?.includes(i);
//                     return (
//                       <label key={i} className="flex items-center gap-2">
//                         <input
//                           type="checkbox"
//                           checked={checked}
//                           onChange={() => toggleMulti(q.id, i)}
//                         />
//                         <span className="text-sm">{opt}</span>
//                       </label>
//                     );
//                   })}
//                 </div>
//               )}

//               {q.type === 'fr' && (
//                 <textarea
//                   className="w-full border rounded-lg p-2"
//                   rows={8}
//                   placeholder="Write your reasoning, design, or debugging plan…"
//                   onChange={e => setFR(q.id, e.target.value)}
//                 />
//               )}
//             </div>
//           ))}

//           <div className="pt-2">
//             <button className="btn-primary" disabled={submitting} onClick={submit}>
//               {submitting ? 'Grading…' : 'Submit Exam'}
//             </button>
//           </div>
//         </div>

//         <div className="space-y-4">
//           <WebcamPresence active={proctorOn} attemptId={attemptId} />
//           <div className="card text-sm text-slate-600">
//             Time limit: {Math.round((test.policy?.timeLimitSec || 1800)/60)} minutes
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }


// 'use client';

// import { useEffect, useMemo, useRef, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Toaster, { toastBus } from '@/components/Toaster';
// import { useProctor } from '@/components/Proctor/useProctor';
// import WebcamPresence from '@/components/Proctor/WebcamPresence';
// import type {
//   AttemptPayload,
//   Question,
//   MCQSingle,
//   MCQMulti,
//   FreeResponse,
//   AnswerMap,
// } from '@/lib/schema';

// const DEFAULT_TOTAL_SECONDS = 30 * 60; // 30 minutes

// export default function ExamPage({ params }: { params: { attemptId: string } }) {
//   const { attemptId } = params;
//   const router = useRouter();

//   const [userId, setUserId] = useState<string | null>(null);
//   const [payload, setPayload] = useState<AttemptPayload | null>(null);
//   const [answers, setAnswers] = useState<AnswerMap>({});
//   const [proctorActive, setProctorActive] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   // timer
//   const [remaining, setRemaining] = useState<number>(DEFAULT_TOTAL_SECONDS);
//   const submittedRef = useRef(false);

//   // single proctor hook (with internal de-duped notifications)
//   useProctor(attemptId, proctorActive);

//   useEffect(() => {
//     fetch('/api/user/id').then((r) => r.json()).then((j) => setUserId(j.userId));
//   }, []);

//   // Load attempt details (questions + policy)
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const r = await fetch(`/api/test/attempt/${attemptId}`, { cache: 'no-store' });
//         if (!r.ok) throw new Error(`HTTP ${r.status}`);
//         const j = (await r.json()) as AttemptPayload;
//         if (cancelled) return;
//         setPayload(j);

//         // init answers shape
//         const init: AnswerMap = {};
//         j.questions.forEach((q: Question) => {
//           if (q.kind === 'mcq-single') init[q.id] = null;
//           else if (q.kind === 'mcq-multi') init[q.id] = [];
//           else if (q.kind === 'free-response') init[q.id] = '';
//         });
//         setAnswers(init);
//       } catch {
//         toastBus.push('Failed to load exam.', 'error');
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [attemptId]);

//   // Enter fullscreen and start proctor + timer once ready
//   useEffect(() => {
//     if (!payload) return;
//     (async () => {
//       try {
//         await document.documentElement.requestFullscreen?.();
//       } catch {}
//       setProctorActive(true);
//       setRemaining(payload.policy?.timeLimitSec ?? DEFAULT_TOTAL_SECONDS);
//     })();

//     // cleanup on unmount (or navigation)
//     return () => {
//       setProctorActive(false);
//       try {
//         document.exitFullscreen?.();
//       } catch {}
//     };
//   }, [payload]);

//   // 1-second countdown + auto-submit
//   useEffect(() => {
//     if (!payload) return;
//     if (submittedRef.current) return;

//     const interval = window.setInterval(() => {
//       setRemaining((prev) => {
//         if (prev <= 1) {
//           window.clearInterval(interval);
//           handleSubmit(true); // auto submit
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => window.clearInterval(interval);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [payload]);

//   const timeMMSS = useMemo(() => {
//     const m = Math.floor(remaining / 60);
//     const s = remaining % 60;
//     return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
//   }, [remaining]);

//   function setSingle(id: string, choice: number | null) {
//     setAnswers((prev: AnswerMap) => ({ ...prev, [id]: choice }));
//   }

//   function setMulti(id: string, choice: number, checked: boolean) {
//     setAnswers((prev: AnswerMap) => {
//       const arr = Array.isArray(prev[id]) ? (prev[id] as number[]) : [];
//       const next = checked ? [...new Set([...arr, choice])] : arr.filter((c) => c !== choice);
//       return { ...prev, [id]: next };
//     });
//   }

//   function setFree(id: string, text: string) {
//     setAnswers((prev: AnswerMap) => ({ ...prev, [id]: text }));
//   }


//   async function handleSubmit(auto = false) {
//     if (submittedRef.current) return;
//     submittedRef.current = true;
//     setSubmitting(true);

//     // stop proctor + exit fullscreen
//     setProctorActive(false);
//     try {
//       await document.exitFullscreen?.();
//     } catch {}

//     try {
//       const res = await fetch('/api/test/grade', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ userId, attemptId, answers }),
//       });
//       const j = await res.json();
//       if (typeof j?.score === 'number') {
//         if (auto) toastBus.push('Time is up. Auto-submitted.', 'info');
//         // Go to results/build screen
//         const q = j.passed ? '?passed=1' : '?passed=0';
//         window.location.href = `/build${q}`;
//       } else {
//         toastBus.push('Grading failed. Please retry.', 'error');
//         // allow retry once if grading failed
//         submittedRef.current = false;
//       }
//     } catch {
//       toastBus.push('Network error while grading.', 'error');
//       submittedRef.current = false;
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   if (!payload) {
//     return (
//       <main className="max-w-5xl mx-auto py-10 px-6">
//         <Toaster />
//         <div className="animate-pulse space-y-3">
//           <div className="h-6 w-1/3 bg-slate-200 rounded" />
//           <div className="h-4 w-1/2 bg-slate-200 rounded" />
//           <div className="h-4 w-2/3 bg-slate-200 rounded" />
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="space-y-6 max-w-6xl mx-auto py-8 px-6">
//       <Toaster />
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-2xl font-semibold tracking-tight">Exam (Attempt {attemptId})</h2>
//           <p className="text-slate-600 text-sm">Proctoring enabled. Do not switch tabs or exit fullscreen.</p>
//         </div>
//         <div className="text-lg font-mono px-3 py-1 rounded bg-slate-900 text-white">{timeMMSS}</div>
//       </div>

//       <div className="grid lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-2 space-y-4">
//           <div className="card">
//             <div className="card-title">Questions</div>
//             <div className="mt-3 space-y-4">
//               {payload.questions.map((q: Question) => {
//                 if (q.kind === 'mcq-single') {
//                   const qq = q as MCQSingle;
//                   const v = (answers[q.id] as number | null) ?? null;
//                   return (
//                     <div key={q.id} className="border rounded-xl p-4">
//                       <p className="mb-2 text-sm">
//                         <b>Multiple choice (single):</b> {qq.prompt}
//                       </p>
//                       <div className="space-y-2">
//                         {qq.options.map((opt, i) => (
//                           <label key={i} className="flex items-center gap-2">
//                             <input
//                               type="radio"
//                               name={q.id}
//                               checked={v === i}
//                               onChange={() => setSingle(q.id, i)}
//                             />
//                             <span className="text-sm">{opt}</span>
//                           </label>
//                         ))}
//                         <button
//                           type="button"
//                           className="text-xs text-slate-500 underline"
//                           onClick={() => setSingle(q.id, null)}
//                         >
//                           Clear selection
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 }

//                 if (q.kind === 'mcq-multi') {
//                   const qq = q as MCQMulti;
//                   const arr = (answers[q.id] as number[]) || [];
//                   return (
//                     <div key={q.id} className="border rounded-xl p-4">
//                       <p className="mb-2 text-sm">
//                         <b>Multiple choice (multiple):</b> {qq.prompt}
//                       </p>
//                       <div className="space-y-2">
//                         {qq.options.map((opt, i) => {
//                           const checked = arr.includes(i);
//                           return (
//                             <label key={i} className="flex items-center gap-2">
//                               <input
//                                 type="checkbox"
//                                 checked={checked}
//                                 onChange={(e) => setMulti(q.id, i, e.target.checked)}
//                               />
//                               <span className="text-sm">{opt}</span>
//                             </label>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   );
//                 }

//                 if (q.kind === 'free-response') {
//                   const qq = q as FreeResponse;
//                   const v = (answers[q.id] as string) || '';
//                   return (
//                     <div key={q.id} className="border rounded-xl p-4">
//                       <p className="mb-2 text-sm">
//                         <b>Free response:</b> {qq.prompt}
//                       </p>
//                       <textarea
//                         className="textarea"
//                         rows={6}
//                         placeholder="Write your answer here…"
//                         value={v}
//                         onChange={(e) => setFree(q.id, e.target.value)}
//                       />
//                     </div>
//                   );
//                 }

//                 return null;
//               })}
//             </div>
//           </div>
//         </div>

//         <div className="space-y-4">
//           <WebcamPresence attemptId={attemptId} active={proctorActive} />
//           <div className="card">
//             <div className="card-title">Actions</div>
//             <div className="mt-3 flex flex-col gap-2">
//               <button
//                 className="btn btn-primary"
//                 type="button"
//                 onClick={() => handleSubmit(false)}
//                 disabled={!userId || submitting || submittedRef.current}
//               >
//                 {submitting ? 'Submitting…' : 'Submit Exam'}
//               </button>
//               <p className="text-xs text-slate-500">
//                 Auto-submit will trigger when the timer reaches 00:00.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }


'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Toaster, { toastBus } from '@/components/Toaster';
import { useProctor } from '@/components/Proctor/useProctor';
import WebcamPresence from '@/components/Proctor/WebcamPresence';
import type {
  AttemptPayload,
  Question,
  MCQSingle,
  MCQMulti,
  FreeResponse,
  AnswerMap,
} from '@/lib/schema';

const DEFAULT_TOTAL_SECONDS = 30 * 60; // 30 minutes

export default function ExamPage({ params }: { params: { attemptId: string } }) {
  const { attemptId } = params;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [proctorActive, setProctorActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [remaining, setRemaining] = useState<number>(DEFAULT_TOTAL_SECONDS);
  const submittedRef = useRef(false);

  useProctor(attemptId, proctorActive);

  // helper: safely exit fullscreen only when active to avoid DOMException
  async function safeExitFullscreen() {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }

  useEffect(() => {
    fetch('/api/user/id').then((r) => r.json()).then((j) => setUserId(j.userId));
  }, []);

  // Load attempt details (try server, fallback to sessionStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/test/${encodeURIComponent(attemptId)}`, { cache: 'no-store' });
        if (r.ok) {
          const j = (await r.json()) as AttemptPayload;
          if (cancelled) return;
          setPayload(j);
          const init: AnswerMap = {};
          j.questions.forEach((q: Question) => {
            if ((q as any).kind === 'mcq-single') init[q.id] = null;
            else if ((q as any).kind === 'mcq-multi') init[q.id] = [];
            else if ((q as any).kind === 'free-response') init[q.id] = '';
          });
          setAnswers(init);
          return;
        }

        // fallback: try sessionStorage (set by /apply before navigation)
        try {
          const raw = sessionStorage.getItem(`attempt-${attemptId}`);
          if (raw) {
            const j = JSON.parse(raw) as AttemptPayload;
            if (cancelled) return;
            setPayload(j);
            const init: AnswerMap = {};
            j.questions.forEach((q: Question) => {
              if ((q as any).kind === 'mcq-single') init[q.id] = null;
              else if ((q as any).kind === 'mcq-multi') init[q.id] = [];
              else if ((q as any).kind === 'free-response') init[q.id] = '';
            });
            setAnswers(init);
            return;
          }
        } catch {}

        toastBus.push('Failed to load exam. Restart from Apply.', 'error');
      } catch {
        toastBus.push('Failed to load exam. Restart from Apply.', 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  // enter fullscreen, start proctor + timer
  useEffect(() => {
    if (!payload) return;
    (async () => {
      try { await document.documentElement.requestFullscreen?.(); } catch {}
      setProctorActive(true);
      setRemaining(payload.policy?.timeLimitSec ?? DEFAULT_TOTAL_SECONDS);
    })();
    return () => {
      setProctorActive(false);
      // fire-and-forget safe exit
      safeExitFullscreen().catch(() => {});
    };
  }, [payload]);

  // countdown + auto-submit
  useEffect(() => {
    if (!payload || submittedRef.current) return;
    const id = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          window.clearInterval(id);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const timeMMSS = useMemo(() => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [remaining]);

  function setSingle(id: string, choice: number | null) {
    setAnswers((prev: AnswerMap) => ({ ...prev, [id]: choice }));
  }
  function setMulti(id: string, choice: number, checked: boolean) {
    setAnswers((prev: AnswerMap) => {
      const arr = Array.isArray(prev[id]) ? (prev[id] as number[]) : [];
      const next = checked ? [...new Set([...arr, choice])] : arr.filter((c) => c !== choice);
      return { ...prev, [id]: next };
    });
  }
  function setFree(id: string, text: string) {
    setAnswers((prev: AnswerMap) => ({ ...prev, [id]: text }));
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    setProctorActive(false);
  try { await safeExitFullscreen(); } catch {}

    try {
      const res = await fetch('/api/test/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, attemptId, answers }),
      });
      const j = await res.json();
      if (typeof j?.score === 'number') {
        if (auto) toastBus.push('Time is up. Auto-submitted.', 'info');
        // stop camera/mic synchronously if available, exit fullscreen, then navigate
        try { (globalThis as any).__cm_proctor_stop?.(); } catch {}
    try { await safeExitFullscreen(); } catch {}
        const q = j.passed ? '?passed=1' : '?passed=0';
        router.push(`/results/${attemptId}${q}`);
      } else {
        toastBus.push('Grading failed. Please retry.', 'error');
        submittedRef.current = false;
      }
    } catch {
      toastBus.push('Network error while grading.', 'error');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  if (!payload) {
    return (
      <main className="max-w-5xl mx-auto py-10 px-6">
        <Toaster />
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 bg-slate-200 rounded" />
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
          <div className="h-4 w-2/3 bg-slate-200 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 max-w-6xl mx-auto py-8 px-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Exam (Attempt {attemptId})</h2>
          <p className="text-slate-600 text-sm">Proctoring enabled. Do not switch tabs or exit fullscreen.</p>
        </div>
        <div className="text-lg font-mono px-3 py-1 rounded bg-slate-900 text-white">{timeMMSS}</div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-title">Questions</div>
            <div className="mt-3 space-y-4">
              {payload.questions.map((q: Question) => {
                const kind = (q as any).kind;
                if (kind === 'mcq-single') {
                  const qq = q as MCQSingle;
                  const v = (answers[q.id] as number | null) ?? null;
                  return (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="mb-2 text-sm"><b>Multiple choice (single):</b> {qq.prompt}</p>
                      <div className="space-y-2">
                        {qq.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input type="radio" name={q.id} checked={v === i} onChange={() => setSingle(q.id, i)} />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                        <button type="button" className="text-xs text-slate-500 underline" onClick={() => setSingle(q.id, null)}>
                          Clear selection
                        </button>
                      </div>
                    </div>
                  );
                }
                if (kind === 'mcq-multi') {
                  const qq = q as MCQMulti;
                  const arr = (answers[q.id] as number[]) || [];
                  return (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="mb-2 text-sm"><b>Multiple choice (multiple):</b> {qq.prompt}</p>
                      <div className="space-y-2">
                        {qq.options.map((opt, i) => {
                          const checked = arr.includes(i);
                          return (
                            <label key={i} className="flex items-center gap-2">
                              <input type="checkbox" checked={checked} onChange={(e) => setMulti(q.id, i, e.target.checked)} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (kind === 'free-response') {
                  const qq = q as FreeResponse;
                  const v = (answers[q.id] as string) || '';
                  return (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="mb-2 text-sm"><b>Free response:</b> {qq.prompt}</p>
                      <textarea
                        className="w-full border rounded-lg p-2"
                        rows={6}
                        placeholder="Write your answer here…"
                        value={v}
                        onChange={(e) => setFree(q.id, e.target.value)}
                        onPaste={(e) => { e.preventDefault(); toastBus.push('Pasting is disabled during the exam', 'error'); (globalThis as any).__cm_proctor_notify?.('paste'); }}
                        onCopy={(e) => { e.preventDefault(); toastBus.push('Copying is disabled during the exam', 'error'); (globalThis as any).__cm_proctor_notify?.('copy'); }}
                        onCut={(e) => { e.preventDefault(); toastBus.push('Cut is disabled during the exam', 'error'); (globalThis as any).__cm_proctor_notify?.('cut'); }}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                            e.preventDefault();
                            toastBus.push('Pasting is disabled during the exam', 'error');
                            (globalThis as any).__cm_proctor_notify?.('paste');
                          }
                        }}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <WebcamPresence attemptId={attemptId} active={proctorActive} />
          <div className="card">
            <div className="card-title">Actions</div>
            <div className="mt-3 flex flex-col gap-2">
              <button className="btn btn-primary" type="button" onClick={() => handleSubmit(false)}
                disabled={!userId || submitting || submittedRef.current}>
                {submitting ? 'Submitting…' : 'Submit Exam'}
              </button>
              <p className="text-xs text-slate-500">Auto-submit will trigger at 00:00.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
