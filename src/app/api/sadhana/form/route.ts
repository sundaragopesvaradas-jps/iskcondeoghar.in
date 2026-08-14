import { NextResponse } from 'next/server';
import { isCosmosConfigured } from '@/lib/cosmos';
import {
  getChartOptionOrder,
  getSadhanaFormFields,
} from '@/sadhana/sadhanaOptionsStore';

export const runtime = 'nodejs';

/** Public form + chart option lists from Cosmos columnSchemas (no code fallbacks). */
export async function GET() {
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
    const [fields, optionOrderByChartColumn] = await Promise.all([
      getSadhanaFormFields(),
      getChartOptionOrder(),
    ]);
    return NextResponse.json({
      status: 'success',
      fields,
      optionOrderByChartColumn,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load form config';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
