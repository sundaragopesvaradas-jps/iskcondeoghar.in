import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnSession, requireAdmnWrite } from '@/admn/admnApiGuard';
import { deleteRow, listRows, upsertRow } from '@/admn/admnDataStore';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ tableId: string; tabId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth.error;
  try {
    const { tableId, tabId } = await ctx.params;
    const sp = req.nextUrl.searchParams;
    const offset = parseInt(sp.get('offset') || '0', 10);
    const limit = parseInt(sp.get('limit') || '50', 10);
    const result = await listRows({
      tableId: decodeURIComponent(tableId),
      tabId: decodeURIComponent(tabId),
      offset,
      limit,
    });
    return NextResponse.json({
      status: 'success',
      user: auth.user,
      ...result,
      offset,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId, tabId } = await ctx.params;
    const body = (await req.json()) as {
      id?: string;
      data?: Record<string, string>;
    };
    const row = await upsertRow({
      tableId: decodeURIComponent(tableId),
      tabId: decodeURIComponent(tabId),
      id: body.id,
      data: body.data || {},
      username: auth.user.username,
    });
    return NextResponse.json({ status: 'success', row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId } = await ctx.params;
    const body = (await req.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json(
        { status: 'error', message: 'id required', code: 'INVALID' },
        { status: 400 }
      );
    }
    await deleteRow(decodeURIComponent(tableId), body.id);
    return NextResponse.json({ status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
