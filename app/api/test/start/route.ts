// import { NextRequest, NextResponse } from 'next/server';
// import { newId, saveAttempt, getAttempt } from '@/lib/store';
// import type { GeneratedTest } from '@/lib/schema';

// export const runtime = 'nodejs';

// export async function POST(req: NextRequest) {
//   const body = await req.json().catch(()=> ({}));

//   if (body.getByAttemptId) {
//     const a = getAttempt(body.getByAttemptId);
//     if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });
//     return NextResponse.json({ test: a.test });
//   }

//   const { test } = body;
//   if (!test) return NextResponse.json({ error: 'missing test' }, { status: 400 });

//   const attemptId = newId();
//   saveAttempt({ id: attemptId, test: test as GeneratedTest, proctorEvents: [] });
//   return NextResponse.json({ attemptId });
// }


// app/api/test/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveAttempt, newId } from '@/lib/store';
import type { GeneratedTest } from '@/lib/schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const test = body?.test as GeneratedTest | undefined;
  if (!test || !Array.isArray(test.questions)) {
    return NextResponse.json({ error: 'missing_test' }, { status: 400 });
  }
  const id = newId('attempt-');
  saveAttempt({
    id,
    test,
    answers: [],
    proctorEvents: [],
    graded: undefined,
  });
  return NextResponse.json({ attemptId: id, test });
}
