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

/** Newest sadhana date first; same date → latest submission first; empty dates last */
export function sortSadhanaHistoryRowsByDate(rows: SadhanaHistoryRow[]): SadhanaHistoryRow[] {
  return [...rows].sort((a, b) => {
    const da = (a.Date || '').trim();
    const db = (b.Date || '').trim();
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    const ka = sadhanaHistoryDateSortKey(da);
    const kb = sadhanaHistoryDateSortKey(db);
    if (ka !== kb) return kb - ka;
    return (b._submissionTimeMs ?? 0) - (a._submissionTimeMs ?? 0);
  });
}
