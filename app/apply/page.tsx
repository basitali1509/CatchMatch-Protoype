'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplyPage() {
  const [level, setLevel] = useState<'junior'|'mid'|'senior'|'architect'>('mid');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    setLoading(true);
    try {
      const gen = await fetch('/api/test/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ level })
      }).then(r=>r.json());

      if (!gen?.questions?.length) throw new Error('No questions generated');

      const start = await fetch('/api/test/start', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ test: gen })
      }).then(r=>r.json());

      // Store the test in sessionStorage as a fallback for the exam page
      try { sessionStorage.setItem(`attempt-${start.attemptId}`, JSON.stringify(start.test)); } catch {}
      router.push(`/exam/${start.attemptId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-6">
      <h1 className="h1">Apply for an Assessment</h1>
      <div className="card space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">Target level</span>
          <select className="mt-1 border rounded-lg p-2" value={level}
            onChange={e=>setLevel(e.target.value as any)}>
            <option value="junior">Junior</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="architect">Architect</option>
          </select>
        </label>
        <button className="btn-primary" disabled={loading} onClick={start}>
          {loading ? 'Preparing exam…' : 'Generate & Start Proctored Exam'}
        </button>
      </div>
    </main>
  );
}
