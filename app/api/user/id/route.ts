// app/api/user/id/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function newId(prefix = 'u_') {
  return prefix + Math.random().toString(36).slice(2, 10);
}

export async function GET() {
  const jar = cookies();
  let userId = jar.get('cm_user')?.value;
  if (!userId) {
    userId = newId();
    jar.set('cm_user', userId, { httpOnly: true, sameSite: 'lax', path: '/' });
  }
  return NextResponse.json({ userId });
}
