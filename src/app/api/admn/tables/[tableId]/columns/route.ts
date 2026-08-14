import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnWrite } from '@/admn/admnApiGuard';
import { addColumn, upsertColumnSchema } from '@/admn/admnDataStore';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ tableId: string }> };

/** Add a column to a tab (metadata only). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId } = await ctx.params;
    const body = (await req.json()) as { tabId?: string; name?: string };
    const table = await addColumn({
      tableId: decodeURIComponent(tableId),
      tabId: String(body.tabId || ''),
      name: String(body.name || ''),
    });
    return NextResponse.json({
      status: 'success',
      tabs: table.tabs,
      columnSchemas: table.columnSchemas || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}

/** Update shared column schema (allowed values) for a table. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const { tableId } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      allowedValues?: string[];
      allowedValuePoints?: Record<string, number>;
    };
    const table = await upsertColumnSchema(decodeURIComponent(tableId), {
      name: String(body.name || ''),
      allowedValues: body.allowedValues,
      allowedValuePoints: body.allowedValuePoints,
    });
    return NextResponse.json({
      status: 'success',
      columnSchemas: table.columnSchemas || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
