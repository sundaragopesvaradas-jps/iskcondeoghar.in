/**
 * Rolling sadhana leaderboard — scored from Responses + columnSchemas points.
 */
import { getRowsContainer, isCosmosConfigured } from '@/lib/cosmos';
import { getTable, type ColumnSchema, type RowDoc } from '@/admn/admnDataStore';
import { RESPONSES_TAB, SADHANA_TABLE_ID, nameKey } from './sadhanaLogic';

export type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  days: number;
};

export type MaskedNameParts = {
  /** First up to 3 letters (visible) */
  head: string;
  /** Remainder (blurred in UI) */
  rest: string;
};

export type LeaderboardWindowSpec = {
  /** 1 = today (most recent day in the window numbering) */
  dayFrom: number;
  dayTo: number;
};

export type LeaderboardPeriod = {
  label: string;
  dayFrom: number;
  dayTo: number;
  from: string;
  to: string;
  entries: LeaderboardEntry[];
};

/** Admin boards: 30-day buckets back ~1 year; last bucket stretches to day 365. */
export const ADMIN_LEADERBOARD_WINDOWS: LeaderboardWindowSpec[] = [
  { dayFrom: 1, dayTo: 30 },
  { dayFrom: 31, dayTo: 60 },
  { dayFrom: 61, dayTo: 90 },
  { dayFrom: 91, dayTo: 120 },
  { dayFrom: 121, dayTo: 150 },
  { dayFrom: 151, dayTo: 180 },
  { dayFrom: 181, dayTo: 210 },
  { dayFrom: 211, dayTo: 240 },
  { dayFrom: 241, dayTo: 270 },
  { dayFrom: 271, dayTo: 300 },
  { dayFrom: 301, dayTo: 330 },
  { dayFrom: 331, dayTo: 365 },
];

function requireCosmos() {
  if (!isCosmosConfigured()) throw new Error('Cosmos DB is not configured.');
}

export function todayYmdKolkata(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function ymdFromUtcMs(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function kolkataTodayUtcNoonMs(today = todayYmdKolkata()): number {
  const [y, m, d] = today.split('-').map((x) => parseInt(x, 10));
  return Date.UTC(y, m - 1, d);
}

/** `daysAgo` 0 = today (Kolkata calendar). */
export function ymdDaysAgo(daysAgo: number, today = todayYmdKolkata()): string {
  const n = Math.max(0, Math.floor(daysAgo));
  return ymdFromUtcMs(kolkataTodayUtcNoonMs(today) - n * 24 * 60 * 60 * 1000);
}

/** Inclusive window: [today-(days-1), today] in Asia/Kolkata calendar dates. */
export function ymdRangeLastDays(days: number): { from: string; to: string } {
  const n = Math.max(1, Math.min(365, days));
  const to = todayYmdKolkata();
  const from = ymdDaysAgo(n - 1, to);
  return { from, to };
}

/**
 * Day numbering: day 1 = today, day 2 = yesterday, … day 365 = 364 days ago.
 * Window [dayFrom, dayTo] → calendar [ymdDaysAgo(dayTo-1), ymdDaysAgo(dayFrom-1)].
 */
export function ymdRangeForDayWindow(
  dayFrom: number,
  dayTo: number,
  today = todayYmdKolkata()
): { from: string; to: string; label: string; dayFrom: number; dayTo: number } {
  const a = Math.max(1, Math.min(365, dayFrom));
  const b = Math.max(a, Math.min(365, dayTo));
  return {
    dayFrom: a,
    dayTo: b,
    label: a === 1 && b === 30 ? 'Last 30 days' : `Days ${a}–${b}`,
    to: ymdDaysAgo(a - 1, today),
    from: ymdDaysAgo(b - 1, today),
  };
}

function dateInRange(dateStr: string, from: string, to: string): boolean {
  const d = String(dateStr || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= from && d <= to;
}

function scoreCell(
  raw: string,
  points: Record<string, number> | undefined
): number {
  if (!points) return 0;
  const text = String(raw || '').trim();
  if (!text) return 0;
  if (text.includes(';')) {
    let sum = 0;
    for (const part of text.split(';')) {
      const v = part.trim();
      if (v && v in points) sum += points[v];
    }
    return sum;
  }
  return points[text] ?? 0;
}

export function scoreResponseRow(
  data: Record<string, string>,
  schemas: ColumnSchema[]
): number {
  let total = 0;
  for (const s of schemas) {
    if (!s.allowedValuePoints || !s.name) continue;
    total += scoreCell(data[s.name] || '', s.allowedValuePoints);
  }
  return total;
}

/** First 3 letters visible; rest for blur (spaces/punctuation stay with rest). */
export function maskSadhanaNameParts(name: string): MaskedNameParts {
  const trimmed = String(name || '').trim();
  if (!trimmed) return { head: '', rest: '' };
  let letterCount = 0;
  let splitAt = 0;
  for (const ch of trimmed) {
    splitAt += ch.length;
    if (/\p{L}/u.test(ch)) {
      letterCount += 1;
      if (letterCount >= 3) break;
    }
  }
  if (letterCount < 3) {
    return { head: trimmed, rest: '' };
  }
  return { head: trimmed.slice(0, splitAt), rest: trimmed.slice(splitAt) };
}

export function toPublicLeaderboardEntry(e: LeaderboardEntry): LeaderboardEntry & {
  nameParts: MaskedNameParts;
} {
  return {
    ...e,
    name: `${maskSadhanaNameParts(e.name).head}…`,
    nameParts: maskSadhanaNameParts(e.name),
  };
}

type Agg = { display: string; points: number; days: Set<string> };

function sortAggs(byName: Map<string, Agg>): Agg[] {
  return Array.from(byName.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.display.localeCompare(b.display, 'hi');
  });
}

function toEntries(sorted: Agg[], limit: number): LeaderboardEntry[] {
  return sorted.slice(0, limit).map((e, i) => ({
    rank: i + 1,
    name: e.display,
    points: e.points,
    days: e.days.size,
  }));
}

async function loadScoredSchemas(): Promise<ColumnSchema[]> {
  const table = await getTable(SADHANA_TABLE_ID);
  return (table?.columnSchemas || []).filter(
    (s) => s.allowedValuePoints && Object.keys(s.allowedValuePoints).length > 0
  );
}

async function aggregateScoresInRange(
  from: string,
  to: string,
  schemas: ColumnSchema[]
): Promise<Agg[]> {
  requireCosmos();
  const container = getRowsContainer();
  const byName = new Map<string, Agg>();

  const iterator = container.items.query<RowDoc>({
    query: 'SELECT c.data FROM c WHERE c.tableId=@t AND c.tabId=@tab',
    parameters: [
      { name: '@t', value: SADHANA_TABLE_ID },
      { name: '@tab', value: RESPONSES_TAB },
    ],
  });

  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const r of resources || []) {
      const data = r.data || {};
      const date = String(data.Date || '').trim();
      if (!dateInRange(date, from, to)) continue;
      const name = String(data.Name || '').trim();
      if (!name) continue;
      const key = nameKey(name);
      const pts = scoreResponseRow(data, schemas);
      let agg = byName.get(key);
      if (!agg) {
        agg = { display: name, points: 0, days: new Set() };
        byName.set(key, agg);
      }
      agg.points += pts;
      agg.days.add(date.slice(0, 10));
    }
  }

  return sortAggs(byName);
}

async function aggregateScores(days: number): Promise<{
  sorted: Agg[];
  scoredColumns: string[];
  from: string;
  to: string;
}> {
  const { from, to } = ymdRangeLastDays(days);
  const schemas = await loadScoredSchemas();
  const sorted = await aggregateScoresInRange(from, to, schemas);
  return { sorted, scoredColumns: schemas.map((s) => s.name), from, to };
}

export async function computeSadhanaLeaderboard(input: {
  days?: number;
  limit?: number;
  /** When set, also return this person's score/rank (full name). */
  highlightName?: string;
}): Promise<{
  days: number;
  from: string;
  to: string;
  entries: LeaderboardEntry[];
  scoredColumns: string[];
  self: LeaderboardEntry | null;
}> {
  const days = Math.max(1, Math.min(365, input.days ?? 30));
  const limit = Math.min(100, Math.max(1, input.limit || 10));
  const { sorted, scoredColumns, from, to } = await aggregateScores(days);

  const entries = toEntries(sorted, limit);

  let self: LeaderboardEntry | null = null;
  const hl = String(input.highlightName || '').trim();
  if (hl) {
    const k = nameKey(hl);
    const idx = sorted.findIndex((e) => nameKey(e.display) === k);
    if (idx >= 0) {
      const e = sorted[idx];
      self = {
        rank: idx + 1,
        name: e.display,
        points: e.points,
        days: e.days.size,
      };
    } else {
      self = { rank: 0, name: hl, points: 0, days: 0 };
    }
  }

  return { days, from, to, entries, scoredColumns, self };
}

/**
 * Admin: one Responses scan over the last 365 days, then top-N per 30-day window
 * (final window is days 331–365).
 */
export async function computeSadhanaAdminYearLeaderboards(input: {
  limit?: number;
  windows?: LeaderboardWindowSpec[];
}): Promise<{
  scoredColumns: string[];
  horizonFrom: string;
  horizonTo: string;
  periods: LeaderboardPeriod[];
}> {
  requireCosmos();
  const limit = Math.min(100, Math.max(1, input.limit || 10));
  const specs = input.windows?.length ? input.windows : ADMIN_LEADERBOARD_WINDOWS;
  const today = todayYmdKolkata();
  const ranges = specs.map((w) => ymdRangeForDayWindow(w.dayFrom, w.dayTo, today));

  const horizonFrom = ranges.reduce(
    (min, r) => (r.from < min ? r.from : min),
    ranges[0]?.from || today
  );
  const horizonTo = ranges.reduce(
    (max, r) => (r.to > max ? r.to : max),
    ranges[0]?.to || today
  );

  const schemas = await loadScoredSchemas();
  const scoredColumns = schemas.map((s) => s.name);

  const buckets = ranges.map(() => new Map<string, Agg>());

  const container = getRowsContainer();
  const iterator = container.items.query<RowDoc>({
    query: 'SELECT c.data FROM c WHERE c.tableId=@t AND c.tabId=@tab',
    parameters: [
      { name: '@t', value: SADHANA_TABLE_ID },
      { name: '@tab', value: RESPONSES_TAB },
    ],
  });

  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const r of resources || []) {
      const data = r.data || {};
      const dateRaw = String(data.Date || '').trim();
      const date = dateRaw.slice(0, 10);
      if (!dateInRange(date, horizonFrom, horizonTo)) continue;
      const name = String(data.Name || '').trim();
      if (!name) continue;
      const key = nameKey(name);
      const pts = scoreResponseRow(data, schemas);

      for (let i = 0; i < ranges.length; i++) {
        if (!dateInRange(date, ranges[i].from, ranges[i].to)) continue;
        const byName = buckets[i];
        let agg = byName.get(key);
        if (!agg) {
          agg = { display: name, points: 0, days: new Set() };
          byName.set(key, agg);
        }
        agg.points += pts;
        agg.days.add(date);
        break; // windows are disjoint
      }
    }
  }

  const periods: LeaderboardPeriod[] = ranges.map((r, i) => ({
    label: r.label,
    dayFrom: r.dayFrom,
    dayTo: r.dayTo,
    from: r.from,
    to: r.to,
    entries: toEntries(sortAggs(buckets[i]), limit),
  }));

  return { scoredColumns, horizonFrom, horizonTo, periods };
}

/** @deprecated Use computeSadhanaLeaderboard */
export async function computeSadhanaMonthlyLeaderboard(input: {
  month?: string;
  limit?: number;
}): Promise<{
  month: string;
  entries: LeaderboardEntry[];
  scoredColumns: string[];
  days: number;
  from: string;
  to: string;
}> {
  const result = await computeSadhanaLeaderboard({
    days: 30,
    limit: input.limit,
  });
  return {
    month: result.to.slice(0, 7),
    entries: result.entries,
    scoredColumns: result.scoredColumns,
    days: result.days,
    from: result.from,
    to: result.to,
  };
}
