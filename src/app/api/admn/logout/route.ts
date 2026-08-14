import { NextResponse } from 'next/server';
import { ADMN_SESSION_COOKIE, sessionCookieOptions } from '@/admn/admnAuth';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(ADMN_SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
