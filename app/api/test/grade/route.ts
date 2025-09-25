// // app/api/test/grade/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getAttempt, saveAnswers, saveGrade } from '@/lib/store';
// import { getOpenAI } from '@/lib/openai';
// import type {
//   Answer, AnswerFR, AnswerMulti, AnswerSingle,
//   GradeResult, Question, MCQSingle, MCQMulti, FreeResponse
// } from '@/lib/schema';

// export const runtime = 'nodejs';

// function qType(q: Question): string {
//   return (q as any).type || (q as any).kind || '';
// }

// function normalizeAnswers(
//   questions: Question[],
//   incoming: any
// ): Answer[] {
//   // If the client sent an array of answers already in our shape, accept it.
//   if (Array.isArray(incoming) && incoming.every(a => a && typeof a.id === 'string' && typeof a.type === 'string')) {
//     return incoming as Answer[];
//   }

//   // If the client sent a map: Record<id, value>
//   if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
//     const out: Answer[] = [];
//     for (const q of questions) {
//       const t = qType(q);
//       const v = (incoming as Record<string, any>)[q.id];

//       if (t === 'mcq-single') {
//         const a: AnswerSingle = { id: q.id, type: 'mcq-single', choice: (typeof v === 'number' ? v : null) };
//         out.push(a);
//       } else if (t === 'mcq-multi') {
//         const arr = Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
//         const a: AnswerMulti = { id: q.id, type: 'mcq-multi', choices: arr };
//         out.push(a);
//       } else if (t === 'free-response') {
//         const a: AnswerFR = { id: q.id, type: 'free-response', text: typeof v === 'string' ? v : '' };
//         out.push(a);
//       } else if (t === 'fr') {
//         const a: AnswerFR = { id: q.id, type: 'fr', text: typeof v === 'string' ? v : '' };
//         out.push(a);
//       }
//     }
//     return out;
//   }

//   // Fallback: nothing usable
//   return [];
// }

// export async function POST(req: NextRequest) {
//   const body = await req.json().catch(() => ({}));

//   // read-only access for results page
//   if (body?.read) {
//     const a = getAttempt(body.read);
//     if (!a?.graded) return NextResponse.json({ error: 'no_grade' }, { status: 404 });
//     return NextResponse.json(a.graded);
//   }

//   try {
//     const { attemptId } = body;
//     if (!attemptId) return NextResponse.json({ error: 'missing_attempt' }, { status: 400 });

//     const attempt = getAttempt(attemptId);
//     if (!attempt) return NextResponse.json({ error: 'attempt_not_found' }, { status: 404 });

//     const test = attempt.test;
//     const answers: Answer[] = normalizeAnswers(test.questions, body.answers);
//     saveAnswers(attemptId, answers); // persist exactly what we grade

//     // ----- MCQ scoring -----
//     let mcqCorrect = 0;
//     const mcqDetail: Array<{ id: string; correct: boolean }> = [];

//     // Build quick lookup for answers
//     const aMap = new Map<string, Answer>(answers.map((a) => [a.id, a]));

//     for (const q of test.questions) {
//       const t = qType(q);

//       if (t === 'mcq-single') {
//         const ans = aMap.get(q.id) as AnswerSingle | undefined;
//         const exp = (q as MCQSingle).correct;
//         const ok = !!ans && ans.type === 'mcq-single' && ans.choice === exp;
//         mcqDetail.push({ id: q.id, correct: ok });
//         if (ok) mcqCorrect++;
//       }

//       if (t === 'mcq-multi') {
//         const ans = aMap.get(q.id) as AnswerMulti | undefined;
//         const expected = new Set((q as MCQMulti).correct || []);
//         const got = new Set((ans?.choices || []));
//         let ok = expected.size === got.size;
//         if (ok) for (const v of expected) if (!got.has(v)) { ok = false; break; }
//         mcqDetail.push({ id: q.id, correct: ok });
//         if (ok) mcqCorrect++;
//       }
//     }

//     const totalMcq = test.questions.filter((q) => {
//       const t = qType(q);
//       return t === 'mcq-single' || t === 'mcq-multi';
//     }).length;

//     const mcqScore = totalMcq ? Math.round((mcqCorrect / totalMcq) * 100) : 0;

//     // ----- Free-response scoring (LLM rubric) -----
//     const frQs = test.questions.filter((q) => {
//       const t = qType(q);
//       return t === 'free-response' || t === 'fr';
//     }) as FreeResponse[];

//     let frSum = 0;
//     const frDetail: Array<{ id: string; aiScore: number; notes: string }> = [];

//     if (frQs.length > 0) {
//       const oai = getOpenAI();
//       for (const q of frQs) {
//         const ans = aMap.get(q.id) as AnswerFR | undefined;
//         const text = (ans && (ans.type === 'free-response' || ans.type === 'fr') && typeof ans.text === 'string')
//           ? ans.text.trim()
//           : '';

//         // Build a concise rubric prompt
//         const rubric = Array.isArray(q.rubric) && q.rubric.length
//           ? q.rubric.join('\n- ')
//           : 'Technical correctness; clarity; completeness; tradeoff awareness; practical feasibility.';

//         const prompt = `
// Return STRICT JSON only: {"score": number, "notes": "short justification (1–2 sentences)"}
// Score is 0..100 (no text, no extra keys).

// Rubric (0–100 total):
// - ${rubric}

// Question:
// ${q.prompt}

// Candidate answer:
// ${text || '(empty)'}
//         `.trim();

//         const rsp = await oai.chat.completions.create({
//           model: 'gpt-4o-mini',
//           response_format: { type: 'json_object' },
//           temperature: 0,
//           messages: [
//             { role: 'system', content: 'You are a strict, consistent software engineering examiner. Avoid score inflation.' },
//             { role: 'user', content: prompt }
//           ]
//         });

//         let js = { score: 0, notes: 'N/A' };
//         try { js = JSON.parse(rsp.choices[0]?.message?.content || '{}'); } catch {}
//         const s = Math.max(0, Math.min(100, Number(js.score) || 0));
//         frSum += s;
//         frDetail.push({ id: q.id, aiScore: s, notes: String(js.notes || '') });
//       }
//     }

//     const frScore = frQs.length ? Math.round(frSum / frQs.length) : 0;

//     // ----- Weighted total -----
//     const w = test.policy?.weights || { mcq: 0.5, fr: 0.5 };
//     const passing = test.policy?.passingScore ?? 75;

//     const score = Math.round(mcqScore * (w.mcq ?? 0.5) + frScore * (w.fr ?? 0.5));
//     const passed = score >= passing;

//     const result: GradeResult = {
//       score,
//       passed,
//       breakdown: {
//         mcq: Math.round((w.mcq ?? 0.5) * mcqScore),
//         fr: Math.round((w.fr ?? 0.5) * frScore),
//         mcqScore,
//         frScore,
//         mcqDetail,
//         frDetail,
//       },
//     };

//     saveGrade(attemptId, result);
//     return NextResponse.json(result);

//   } catch (e: any) {
//     console.error('[grade] error', e);
//     return NextResponse.json({ error: 'grade_failed', details: String(e?.message || e) }, { status: 500 });
//   }
// }


// app/api/test/grade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAttempt, saveAnswers, saveGrade } from '@/lib/store';
import { getOpenAI } from '@/lib/openai';
import type {
  Answer, AnswerFR, AnswerMulti, AnswerSingle,
  GradeResult, Question, MCQSingle, MCQMulti, FreeResponse
} from '@/lib/schema';

export const runtime = 'nodejs';

function k(q: Question) { return (q as any).kind || (q as any).type; }

function normalizeAnswers(questions: Question[], incoming: any): Answer[] {
  if (Array.isArray(incoming) && incoming.every(a => a && typeof a.id === 'string' && typeof a.type === 'string')) {
    return incoming as Answer[];
  }
  const out: Answer[] = [];
  if (incoming && typeof incoming === 'object') {
    for (const q of questions) {
      const t = k(q);
      const v = (incoming as Record<string, any>)[q.id];
      if (t === 'mcq-single') out.push({ id: q.id, type: 'mcq-single', choice: Number.isInteger(v) ? v : null });
      else if (t === 'mcq-multi') out.push({ id: q.id, type: 'mcq-multi', choices: Array.isArray(v) ? v.filter((x)=>Number.isInteger(x)) : [] });
      else if (t === 'free-response') out.push({ id: q.id, type: 'free-response', text: typeof v === 'string' ? v : '' });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body?.read) {
    const a = getAttempt(body.read);
    if (!a?.graded) return NextResponse.json({ error: 'no_grade' }, { status: 404 });
    return NextResponse.json(a.graded);
  }

  try {
    const { attemptId } = body;
    if (!attemptId) return NextResponse.json({ error: 'missing_attempt' }, { status: 400 });

    const attempt = getAttempt(attemptId);
    if (!attempt) return NextResponse.json({ error: 'attempt_not_found' }, { status: 404 });

    const test = attempt.test;
    const answers: Answer[] = normalizeAnswers(test.questions, body.answers);
    saveAnswers(attemptId, answers);

    // MCQ scoring
    let mcqCorrect = 0;
    const mcqDetail: Array<{ id: string; correct: boolean }> = [];
    const aMap = new Map<string, Answer>(answers.map((a) => [a.id, a]));

    for (const q of test.questions) {
      const t = k(q);
      if (t === 'mcq-single') {
        const ans = aMap.get(q.id) as AnswerSingle | undefined;
        const ok = !!ans && ans.type === 'mcq-single' && ans.choice === (q as MCQSingle).correct;
        mcqDetail.push({ id: q.id, correct: ok });
        if (ok) mcqCorrect++;
      }
      if (t === 'mcq-multi') {
        const ans = aMap.get(q.id) as AnswerMulti | undefined;
        const expected = new Set((q as MCQMulti).correct || []);
        const got = new Set((ans?.choices || []));
        let ok = expected.size === got.size;
        if (ok) for (const v of expected) if (!got.has(v)) { ok = false; break; }
        mcqDetail.push({ id: q.id, correct: ok });
        if (ok) mcqCorrect++;
      }
    }

    const totalMcq = test.questions.filter(q => ['mcq-single','mcq-multi'].includes(k(q))).length;
    const mcqScore = totalMcq ? Math.round((mcqCorrect / totalMcq) * 100) : 0;

    // FR scoring via GPT rubric
    const frQs = test.questions.filter(q => k(q) === 'free-response') as FreeResponse[];
    let frSum = 0;
    const frDetail: Array<{ id: string; aiScore: number; notes: string }> = [];

    if (frQs.length) {
      const oai = getOpenAI();
      for (const q of frQs) {
        const ans = aMap.get(q.id) as AnswerFR | undefined;
        const text = ans && ans.type === 'free-response' ? (ans.text || '').trim() : '';
        const rubric = Array.isArray(q.rubric) && q.rubric.length
          ? q.rubric.join('\n- ')
          : 'Technical correctness; clarity; completeness; tradeoff awareness; feasibility.';

        const prompt = `
Return STRICT JSON only: {"score": number, "notes": "1–2 sentences"}
Score is 0..100.

Rubric:
- ${rubric}

Question:
${q.prompt}

Candidate answer:
${text || '(empty)'}
        `.trim();

        const rsp = await oai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0,
          messages: [
            { role: 'system', content: 'You are a strict, consistent software engineering examiner. Avoid score inflation.' },
            { role: 'user', content: prompt }
          ]
        });

        let js = { score: 0, notes: 'N/A' };
        try { js = JSON.parse(rsp.choices[0]?.message?.content || '{}'); } catch {}
        const s = Math.max(0, Math.min(100, Number(js.score) || 0));
        frSum += s;
        frDetail.push({ id: q.id, aiScore: s, notes: String(js.notes || '') });
      }
    }

    const frScore = frQs.length ? Math.round(frSum / frQs.length) : 0;

    const w = test.policy?.weights || { mcq: 0.5, fr: 0.5 };
    const passing = test.policy?.passingScore ?? 75;
    const score = Math.round(mcqScore * (w.mcq ?? 0.5) + frScore * (w.fr ?? 0.5));
    const passed = score >= passing;

    const result: GradeResult = {
      score,
      passed,
      breakdown: {
        mcq: Math.round((w.mcq ?? 0.5) * mcqScore),
        fr: Math.round((w.fr ?? 0.5) * frScore),
        mcqScore,
        frScore,
        mcqDetail,
        frDetail,
      },
    };

    saveGrade(attemptId, result);
    return NextResponse.json(result);

  } catch (e: any) {
    console.error('[grade] error', e);
    return NextResponse.json({ error: 'grade_failed', details: String(e?.message || e) }, { status: 500 });
  }
}
