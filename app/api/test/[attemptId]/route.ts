// import { NextRequest, NextResponse } from 'next/server';
// import { getAttempt } from '@/lib/store';

// export const runtime = 'nodejs';

// export async function GET(req: NextRequest, { params }: { params: { attemptId: string } }) {
//   const { attemptId } = params;
//   const a = getAttempt(attemptId);
//   if (!a) return NextResponse.json({ error: 'attempt_not_found' }, { status: 404 });
//   return NextResponse.json({ attemptId: a.id, test: a.test });
// }


// app/api/test/attempt/[attemptId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAttempt } from '@/lib/store';
import type { AttemptPayload } from '@/lib/schema';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const a = getAttempt(params.attemptId);
  if (!a) return NextResponse.json({ error: 'attempt_not_found' }, { status: 404 });
  const payload: AttemptPayload = {
    attemptId: a.id,
    questions: a.test.questions,
    policy: a.test.policy || {},
    level: a.test.level,
  };
  return NextResponse.json(payload);
}
