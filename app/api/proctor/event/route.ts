import { NextRequest, NextResponse } from 'next/server';
import { addProctorEvent } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.attemptId || !body.type) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    addProctorEvent(body.attemptId, { type: body.type, ts: Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
