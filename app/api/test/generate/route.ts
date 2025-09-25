// import { NextRequest, NextResponse } from 'next/server';
// import { getOpenAI } from '@/lib/openai';
// import type { GeneratedTest, Level, Question } from '@/lib/schema';

// export const runtime = 'nodejs';

// const SYSTEM = `
// You create *hiring-quality* software engineering assessments that measure real skills.

// STRICT OUTPUT: one JSON object { "level": "...", "questions": [...], "policy": {...} }.
// - questions must be an array of objects of these allowed types:
//   1) {"type":"mcq-single","id":"...","q":"<clear prompt>","options":["..."],"correctIndex":N,"tags":["..."],"difficulty":1-5}
//   2) {"type":"mcq-multi","id":"...","q":"<clear prompt>","options":["..."],"correctIndices":[...],"tags":["..."],"difficulty":1-5}
//   3) {"type":"fr","id":"...","q":"<scenario prompt>","rubric":"<explicit rubric>","subtype":"design|debug|reasoning","tags":["..."],"difficulty":1-5}

// QUALITY RULES:
// - Every MCQ MUST have a *meaningful question* in "q". Never emit "option1/option2" placeholders.
// - MCQ-single should test core understanding (algorithms, complexity, concurrency, HTTP, SQL, JS/TS semantics).
// - MCQ-multi should test nuanced tradeoffs (e.g., "select all valid invariants", "select safe async patterns").
// - free-response (fr) must be scenario-based (design/debug). Provide a strict rubric with criteria and point breakdown (0–100).
// - Difficulty scales by level:
//   - junior: basics, code reading, small debugging.
//   - mid: systems thinking, REST/DB/indexing, performance tradeoffs, debugging concurrency.
//   - senior: architecture, scalability, caching, consistency models, failure modes.
//   - architect: distributed systems, CAP, back-pressure, observability, cost/perf tradeoffs.
// - 8–10 questions total: ~4–5 MCQ (mixed single & multi) + ~3–4 FR.
// - policy: passingScore >= 70, weights sum to 1 (e.g., {mcq:0.5,fr:0.5}), timeLimitSec 25–45min by level.
// - No trick trivia. Clear, unambiguous wording.`;

// function sanitize(questions: any[]): Question[] {
//   const ok: Question[] = [];
//   const ids = new Set<string>();
//   for (const q of questions || []) {
//     if (!q || typeof q !== 'object') continue;
//     if (!q.id || ids.has(q.id)) q.id = 'q_' + Math.random().toString(36).slice(2,9);
//     ids.add(q.id);
//     if (typeof q.q !== 'string' || q.q.trim().length < 10) continue;

//     if (q.type === 'mcq-single' && Array.isArray(q.options) && typeof q.correctIndex === 'number') {
//       ok.push({ ...q, options: q.options.slice(0, 6) });
//     } else if (q.type === 'mcq-multi' && Array.isArray(q.options) && Array.isArray(q.correctIndices)) {
//       const uniq = Array.from(new Set(q.correctIndices.filter((n:number)=> Number.isInteger(n) && n >= 0)));
//       if (uniq.length > 0) ok.push({ ...q, correctIndices: uniq, options: q.options.slice(0, 8) });
//     } else if (q.type === 'fr' && typeof q.rubric === 'string' && q.rubric.trim().length > 20) {
//       ok.push(q);
//     }
//   }
//   return ok.slice(0, 10);
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { level } = await req.json();
//     const lvl: Level = (['junior','mid','senior','architect'] as Level[]).includes(level) ? level : 'mid';

//     const oai = getOpenAI();
//     const rsp = await oai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       response_format: { type: 'json_object' },
//       temperature: 0.4,
//       messages: [
//         { role: 'system', content: SYSTEM },
//         { role: 'user', content: `Generate a ${lvl} software engineer exam.` }
//       ]
//     });

//     const raw = JSON.parse(rsp.choices[0]?.message?.content || '{}') as GeneratedTest;
//     const questions = sanitize(raw.questions || []);
//     const policy = raw.policy && typeof raw.policy === 'object'
//       ? raw.policy
//       : { passingScore: 75, weights: { mcq: 0.5, fr: 0.5 }, timeLimitSec: 2100 };

//     if (!questions.length) {
//       return NextResponse.json({ error: 'no_questions' }, { status: 500 });
//     }
//     return NextResponse.json({ level: raw.level || lvl, questions, policy });
//   } catch (e:any) {
//     console.error('[generate] error', e);
//     return NextResponse.json({ error: 'generate_failed', details: String(e?.message || e) }, { status: 500 });
//   }
// }


// app/api/test/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import type { GeneratedTest, Level, Question, MCQMulti, MCQSingle, FreeResponse } from '@/lib/schema';

export const runtime = 'nodejs';

const SYSTEM = `
You create hiring-quality software engineering assessments.

STRICT OUTPUT JSON:
{
  "level": "junior|mid|senior|architect",
  "questions": [
    // mcq-single:
    {"type":"mcq-single","id":"...","q":"<question text>","options":["..."],"correctIndex":0,"tags":["..."],"difficulty":1-5},
    // mcq-multi:
    {"type":"mcq-multi","id":"...","q":"<question text>","options":["..."],"correctIndices":[0,2],"tags":["..."],"difficulty":1-5},
    // free-response:
    {"type":"fr","id":"...","q":"<scenario prompt>","rubric":"- criteria...\n- criteria...","tags":["..."],"difficulty":1-5}
  ],
  "policy": {"passingScore":75,"weights":{"mcq":0.5,"fr":0.5},"timeLimitSec":2700}
}

RULES:
- No placeholder MCQs (never "option1/option2"). Always include a meaningful "q".
- 8–10 total: ~4–5 MCQ (mix single/multi) + ~3–4 FR.
- FR rubric is a newline-bulleted string; content meaningful.
- Difficulty scales with level.
`;

function toCanonical(rawQs: any[]): Question[] {
  const out: Question[] = [];
  const ids = new Set<string>();

  for (const q of rawQs || []) {
    if (!q || typeof q !== 'object') continue;

    // ensure id
    let id = String(q.id || '').trim();
    if (!id || ids.has(id)) id = 'q_' + Math.random().toString(36).slice(2, 9);
    ids.add(id);

    const qtext = String(q.q || q.prompt || '').trim();
    if (qtext.length < 10 || /option\s*1|option\s*2/i.test(qtext)) continue;

    if (q.type === 'mcq-single' && Array.isArray(q.options) && Number.isInteger(q.correctIndex)) {
      const item: MCQSingle = {
        id,
        kind: 'mcq-single',
        prompt: qtext,
        options: q.options.slice(0, 6).map((s: any) => String(s)),
        correct: q.correctIndex,
        tags: Array.isArray(q.tags) ? q.tags : undefined,
        difficulty: Number.isFinite(q.difficulty) ? Number(q.difficulty) : undefined,
      };
      out.push(item);
    } else if (q.type === 'mcq-multi' && Array.isArray(q.options) && Array.isArray(q.correctIndices)) {
  // sanitize indices -> number[]
  const rawIdx = (q.correctIndices as unknown[])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 0);
  const uniq: number[] = Array.from(new Set<number>(rawIdx));
  if (!uniq.length) continue;

  const opts: string[] = (q.options as unknown[]).map((s) => String(s)).slice(0, 8);

  const item: MCQMulti = {
    id,
    kind: 'mcq-multi',
    prompt: qtext,
    options: opts,
    correct: uniq,                  // <-- now a clean number[]
    tags: Array.isArray(q.tags) ? q.tags : undefined,
    difficulty: Number.isFinite(q.difficulty) ? Number(q.difficulty) : undefined,
  };
  out.push(item);
}
 else if ((q.type === 'fr' || q.type === 'free-response') && typeof q.rubric === 'string') {
      const lines = q.rubric.split('\n').map((x: string) => x.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
      if (!lines.length) continue;
      const fr: FreeResponse = {
        id,
        kind: 'free-response',
        prompt: qtext,
        rubric: lines,
        tags: Array.isArray(q.tags) ? q.tags : undefined,
        difficulty: Number.isFinite(q.difficulty) ? Number(q.difficulty) : undefined,
      };
      out.push(fr);
    }
  }
  return out.slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const { level } = await req.json().catch(() => ({}));
    const lvl: Level = (['junior','mid','senior','architect'] as Level[]).includes(level) ? level : 'mid';

    const oai = getOpenAI();
    const rsp = await oai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Generate a ${lvl} software engineer exam.` }
      ]
    });

    const raw = JSON.parse(rsp.choices[0]?.message?.content || '{}') as GeneratedTest;
    const questions = toCanonical((raw as any).questions || []);
    const policy = (raw && typeof raw.policy === 'object')
      ? raw.policy
      : { passingScore: 75, weights: { mcq: 0.5, fr: 0.5 }, timeLimitSec: 2700 };

    if (!questions.length) return NextResponse.json({ error: 'no_questions' }, { status: 500 });

    return NextResponse.json({ level: raw.level || lvl, questions, policy });
  } catch (e: any) {
    console.error('[generate] error', e);
    return NextResponse.json({ error: 'generate_failed', details: String(e?.message || e) }, { status: 500 });
  }
}
