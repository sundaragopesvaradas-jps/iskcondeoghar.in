import { NextResponse } from 'next/server';
import { requireAdmnSession } from '@/admn/admnApiGuard';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ status: 'success', user: auth.user });
}
