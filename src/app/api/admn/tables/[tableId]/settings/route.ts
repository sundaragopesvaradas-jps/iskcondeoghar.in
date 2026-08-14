import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnWrite } from '@/admn/admnApiGuard';
import { updateTableAdminKey } from '@/admn/admnDataStore';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ tableId: string }> };

/** Update table-level settings (e.g. sadhana overview admin key). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId } = await ctx.params;
    const body = (await req.json()) as { adminKey?: string };
    if (!('adminKey' in body)) {
      return NextResponse.json(
        { status: 'error', message: 'adminKey required', code: 'INVALID' },
        { status: 400 }
      );
    }
    const table = await updateTableAdminKey(
      decodeURIComponent(tableId),
      String(body.adminKey ?? '')
    );
    return NextResponse.json({
      status: 'success',
      adminKey: table.adminKey || '',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
