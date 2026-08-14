import { NextRequest, NextResponse } from 'next/server';
import { isCosmosConfigured } from '@/lib/cosmos';
import { runSadhanaAction } from '@/sadhana/sadhanaCosmosStore';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sadhana API is running',
    cosmos: isCosmosConfigured(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isCosmosConfigured()) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Sadhana backend is not configured (Cosmos).',
          code: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const text = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(text || '{}') as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON body', code: 'SERVER_ERROR' },
        { status: 400 }
      );
    }

    const result = await runSadhanaAction(body);
    if (result.status === 'error') {
      const status =
        result.code === 'FORBIDDEN'
          ? 403
          : result.code === 'NOT_CONFIGURED'
            ? 503
            : result.code === 'UNKNOWN_ACTION'
              ? 400
              : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
