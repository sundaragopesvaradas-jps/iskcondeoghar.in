import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnWrite } from '@/admn/admnApiGuard';
import { createTab } from '@/admn/admnDataStore';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ tableId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId } = await ctx.params;
    const body = (await req.json()) as { name?: string };
    const table = await createTab(tableId, String(body.name || ''));
    return NextResponse.json({ status: 'success', table });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
