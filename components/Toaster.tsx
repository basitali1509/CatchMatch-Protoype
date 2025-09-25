'use client';
import { useEffect, useState } from 'react';

type Tone = 'info'|'success'|'error';
export type Toast = { id: string; text: string; tone: Tone };
type Listener = (t: Toast) => void;

const listeners: Listener[] = [];
export const toastBus = {
  on(fn: Listener) { listeners.push(fn); },
  push(text: string, tone: Tone = 'info') {
    listeners.forEach(fn => fn({ id: Math.random().toString(36).slice(2), text, tone }));
  }
};

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500);
    };
    toastBus.on(on);
  }, []);
  return (
    <div className="fixed top-4 inset-x-0 flex justify-center z-50">
      <div className="space-y-2">
        {toasts.map(t=>(
          <div key={t.id}
               className={`px-4 py-2 rounded-xl text-white text-sm shadow
               ${t.tone==='success'?'bg-green-600':t.tone==='error'?'bg-rose-600':'bg-slate-800'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
