import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnSession } from '@/admn/admnApiGuard';
import { computeSadhanaAdminYearLeaderboards } from '@/sadhana/sadhanaLeaderboard';

export const runtime = 'nodejs';

/**
 * Admin leaderboards — rolling 30-day windows back to day 365
 * (last window is days 331–365). Full names.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth.error;
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10);
    const result = await computeSadhanaAdminYearLeaderboards({ limit });
    const first = result.periods[0];
    return NextResponse.json({
      status: 'success',
      scoredColumns: result.scoredColumns,
      horizonFrom: result.horizonFrom,
      horizonTo: result.horizonTo,
      periods: result.periods,
      // Backward-compatible single-board fields (most recent window)
      from: first?.from,
      to: first?.to,
      entries: first?.entries || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
