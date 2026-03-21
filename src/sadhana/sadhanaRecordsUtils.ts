import { normalizeDevoteeName } from './sadhanaNameFieldConstants';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';

/** True iff trimmed normalized `name` exactly matches an entry in the suggestion list (case-insensitive). */
export function isDevoteeNameInList(name: string, list: string[]): boolean {
  const n = normalizeDevoteeName(name).toLowerCase();
  if (!n) return false;
  return list.some((x) => normalizeDevoteeName(x).toLowerCase() === n);
}

/** Use list spelling/casing when the typed name matches a row (for API + display). */
export function resolveCanonicalDevoteeName(name: string, list: string[]): string {
  const n = normalizeDevoteeName(name).toLowerCase();
  const hit = list.find((x) => normalizeDevoteeName(x).toLowerCase() === n);
  return hit ? normalizeDevoteeName(hit) : normalizeDevoteeName(name);
}

/** Parse Date column (yyyy-MM-dd or parseable) for sorting. */
export function sadhanaHistoryDateSortKey(s: string | undefined): number {
  const t = (s || '').trim();
  if (!t) return Number.POSITIVE_INFINITY;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) {
    return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
  }
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

export type SadhanaDateTableOrder = 'newestFirst' | 'oldestFirst';

/**
 * Sort table rows by Date column.
 * `newestFirst`: default user view; `oldestFirst`: admin overview (opposite sequence).
 */
export function sortSadhanaHistoryRowsByDateOrder(
  rows: SadhanaHistoryRow[],
  order: SadhanaDateTableOrder
): SadhanaHistoryRow[] {
  const desc = order === 'newestFirst';
  return [...rows].sort((a, b) => {
    const da = (a.Date || '').trim();
    const db = (b.Date || '').trim();
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    const ka = sadhanaHistoryDateSortKey(da);
    const kb = sadhanaHistoryDateSortKey(db);
    if (ka !== kb) {
      const cmp = kb - ka;
      return desc ? cmp : -cmp;
    }
    const ts = (b._submissionTimeMs ?? 0) - (a._submissionTimeMs ?? 0);
    return desc ? ts : -ts;
  });
}

/** Newest sadhana date first; same date → latest submission first; empty dates last */
export function sortSadhanaHistoryRowsByDate(rows: SadhanaHistoryRow[]): SadhanaHistoryRow[] {
  return sortSadhanaHistoryRowsByDateOrder(rows, 'newestFirst');
}
