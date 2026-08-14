import { NextRequest, NextResponse } from 'next/server';
import { isCosmosConfigured } from '@/lib/cosmos';
import {
  computeSadhanaLeaderboard,
  toPublicLeaderboardEntry,
} from '@/sadhana/sadhanaLeaderboard';
import { nameKey } from '@/sadhana/sadhanaLogic';

export const runtime = 'nodejs';

/**
 * Public top-N leaderboard (last 30 days). Names are masked.
 * Optional `name` returns full `self` score for that devotee (for records view).
 */
export async function GET(req: NextRequest) {
  try {
    if (!isCosmosConfigured()) {
      return NextResponse.json(
        { status: 'error', message: 'Not configured', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }
    const sp = req.nextUrl.searchParams;
    const limit = parseInt(sp.get('limit') || '10', 10);
    const days = parseInt(sp.get('days') || '30', 10);
    const highlightName = sp.get('name') || undefined;
    const mask = sp.get('mask') !== '0';

    const result = await computeSadhanaLeaderboard({
      days,
      limit,
      highlightName: highlightName || undefined,
    });

    const entries = mask
      ? result.entries.map((e) => {
          const pub = toPublicLeaderboardEntry(e);
          const isSelf = Boolean(
            highlightName && nameKey(e.name) === nameKey(String(highlightName))
          );
          if (isSelf) {
            return {
              rank: e.rank,
              name: e.name,
              points: e.points,
              days: e.days,
              nameParts: { head: e.name, rest: '' },
              isSelf: true,
            };
          }
          return { ...pub, isSelf: false };
        })
      : result.entries.map((e) => ({ ...e, isSelf: false }));

    return NextResponse.json({
      status: 'success',
      days: result.days,
      from: result.from,
      to: result.to,
      scoredColumns: result.scoredColumns,
      entries,
      self: result.self,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
