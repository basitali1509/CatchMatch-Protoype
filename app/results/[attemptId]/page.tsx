'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ResultsPage({ params }:{ params:{ attemptId: string }}) {
  const [data, setData] = useState<any>(null);

  useEffect(()=>{
    (async ()=>{
      // quick fetch by calling grade endpoint? We saved grade in memory, but there’s no read API.
      // For local demo, we’ll re-grade with empty answers is bad; instead add tiny read endpoint inside grade route? Simpler: store last grade on window? Avoid.
      // Minimal solution: we call a tiny read endpoint here:
      const res = await fetch('/api/test/grade', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ read: params.attemptId })
      });
      const j = await res.json();
      setData(j);
    })();
  }, [params.attemptId]);

  if (!data) return <main className="max-w-3xl mx-auto py-12 px-6"><div className="card">Loading results…</div></main>;

  if (data.error) return <main className="max-w-3xl mx-auto py-12 px-6"><div className="card">No results found.</div></main>;

  return (
    <main className="max-w-3xl mx-auto py-12 px-6 space-y-6">
      <div className="card">
        <h1 className="h1">Result: {data.passed ? 'Pass ✅' : 'Fail ❌'}</h1>
        <p className="text-slate-600">Score: {data.score}</p>
        <div className="mt-4 text-sm">
          <p>MCQ Score: {data.breakdown?.mcqScore}</p>
          <p>FR Score: {data.breakdown?.frScore}</p>
        </div>
      </div>
  <Link className="btn-secondary inline-block" href="/">Try another level</Link>
    </main>
  );
}
