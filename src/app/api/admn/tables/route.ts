import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnSession, requireAdmnWrite } from '@/admn/admnApiGuard';
import { createTable, listTables } from '@/admn/admnDataStore';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth.error;
  try {
    const tables = await listTables();
    return NextResponse.json({
      status: 'success',
      user: auth.user,
      tables: tables.map((t) => ({
        id: t.id,
        name: t.name,
        columnSchemas: t.columnSchemas || [],
        adminKey: t.adminKey || '',
        tabs: (t.tabs || []).map((tab) => ({
          id: tab.id,
          name: tab.name,
          rowCount: tab.rowCount,
          columns: (tab.columns || []).map((c) => c.name),
        })),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmnWrite();
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as {
      id?: string;
      name?: string;
      firstTabName?: string;
    };
    const table = await createTable({
      id: String(body.id || body.name || ''),
      name: String(body.name || body.id || ''),
      firstTabName: body.firstTabName,
    });
    return NextResponse.json({ status: 'success', table });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
