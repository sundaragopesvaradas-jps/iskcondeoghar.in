import { NextResponse } from 'next/server';
import {
  canWrite,
  isOwner,
  type AdmnRole,
  type AdmnUserPublic,
} from '@/admn/admnTypes';
import { readSessionFromCookies } from '@/admn/admnAuth';

export async function requireAdmnSession(): Promise<
  { user: AdmnUserPublic } | { error: NextResponse }
> {
  const user = await readSessionFromCookies();
  if (!user) {
    return {
      error: NextResponse.json(
        { status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export async function requireAdmnWrite(): Promise<
  { user: AdmnUserPublic } | { error: NextResponse }
> {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth;
  if (!canWrite(auth.user.role as AdmnRole)) {
    return {
      error: NextResponse.json(
        { status: 'error', message: 'Editor or owner access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }
  return auth;
}

export async function requireAdmnOwner(): Promise<
  { user: AdmnUserPublic } | { error: NextResponse }
> {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth;
  if (!isOwner(auth.user.role as AdmnRole)) {
    return {
      error: NextResponse.json(
        { status: 'error', message: 'Owner access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }
  return auth;
}
