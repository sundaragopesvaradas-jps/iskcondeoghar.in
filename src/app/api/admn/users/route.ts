import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnWrite } from '@/admn/admnApiGuard';
import { createAdmnUser, listAdmnUsers } from '@/admn/admnUsersStore';
import { parseRole } from '@/admn/admnTypes';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const users = await listAdmnUsers();
    return NextResponse.json({ status: 'success', users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/** Create admin user — write-role only. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      role?: string;
    };
    const role = parseRole(body.role);
    if (!role) {
      return NextResponse.json(
        { status: 'error', message: 'role must be read or write', code: 'INVALID' },
        { status: 400 }
      );
    }
    const user = await createAdmnUser({
      username: String(body.username || ''),
      password: String(body.password || ''),
      role,
    });
    return NextResponse.json({ status: 'success', user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
