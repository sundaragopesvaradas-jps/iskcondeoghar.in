import { NextRequest, NextResponse } from 'next/server';
import {
  ADMN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/admn/admnAuth';
import { authenticateAdmnUser } from '@/admn/admnUsersStore';
import { isCosmosConfigured } from '@/lib/cosmos';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!isCosmosConfigured()) {
      return NextResponse.json(
        { status: 'error', message: 'Backend not configured', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }
    const body = (await req.json()) as { username?: string; password?: string };
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Username and password required', code: 'INVALID' },
        { status: 400 }
      );
    }
    const user = await authenticateAdmnUser(username, password);
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid username or password', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const token = await createSessionToken(user);
    const res = NextResponse.json({ status: 'success', user });
    res.cookies.set(
      ADMN_SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_MAX_AGE_SECONDS)
    );
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
