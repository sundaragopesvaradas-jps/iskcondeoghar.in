import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { sadhanaHistoryDateSortKey } from './sadhanaRecordsUtils';

export type SadhanaChartDateOrder = 'newestFirst' | 'oldestFirst';

export type PrepareChartSeriesOptions = {
  /** X-axis: left = newest (default) or left = oldest (admin overview). */
  dateOrder?: SadhanaChartDateOrder;
};

/**
 * One point per **submission** (row). Row count is already capped by Apps Script (`MAX_HISTORY_ROWS_RETURN`).
 * Sort: by date, then by submission time within the same day.
 */
export function prepareRowsForChartSeries(
  rows: SadhanaHistoryRow[],
  options?: PrepareChartSeriesOptions
): SadhanaHistoryRow[] {
  const dateOrder = options?.dateOrder ?? 'newestFirst';
  const list = rows.filter((r) => (r.Date || '').trim());
  list.sort((a, b) => {
    const ka = sadhanaHistoryDateSortKey(a.Date);
    const kb = sadhanaHistoryDateSortKey(b.Date);
    if (ka !== kb) {
      const cmp = kb - ka;
      return dateOrder === 'newestFirst' ? cmp : -cmp;
    }
    const tsA = a._submissionTimeMs ?? 0;
    const tsB = b._submissionTimeMs ?? 0;
    if (tsA !== tsB) {
      return dateOrder === 'newestFirst' ? tsB - tsA : tsA - tsB;
    }
    return 0;
  });
  return list;
}
