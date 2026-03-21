import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { sadhanaHistoryDateSortKey } from './sadhanaRecordsUtils';

/** Max points along X (distinct dates, newest first in chart). */
export const SADHANA_CHART_MAX_POINTS = 30;

export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * One row per calendar Date (latest submission wins), exclude today, sort by date descending, cap length.
 */
export function prepareRowsForChartSeries(rows: SadhanaHistoryRow[]): SadhanaHistoryRow[] {
  const today = todayYmdLocal();
  const map = new Map<string, SadhanaHistoryRow>();
  for (const r of rows) {
    const dk = (r.Date || '').trim();
    if (!dk || dk === today) continue;
    const prev = map.get(dk);
    const ts = r._submissionTimeMs ?? 0;
    if (!prev || ts > (prev._submissionTimeMs ?? 0)) {
      map.set(dk, r);
    }
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => sadhanaHistoryDateSortKey(b.Date) - sadhanaHistoryDateSortKey(a.Date));
  return arr.slice(0, SADHANA_CHART_MAX_POINTS);
}
