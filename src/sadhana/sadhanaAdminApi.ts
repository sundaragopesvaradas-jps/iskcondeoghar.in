import { SADHANA_HISTORY_TABLE_COLUMNS } from './sadhanaHistoryTableConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import type { SadhanaHistoryErrorCode } from './sadhanaHistoryApi';

function normalizeRow(raw: Record<string, unknown>): SadhanaHistoryRow {
  const o = {} as SadhanaHistoryRow;
  for (const col of SADHANA_HISTORY_TABLE_COLUMNS) {
    o[col] = String(raw[col] ?? '');
  }
  const ts = raw._submissionTimeMs;
  if (typeof ts === 'number' && !Number.isNaN(ts)) {
    o._submissionTimeMs = ts;
  }
  return o;
}

function parseJson(text: string): {
  status?: string;
  message?: string;
  code?: SadhanaHistoryErrorCode | 'FORBIDDEN' | 'INVALID_MODE';
  names?: unknown;
  rows?: unknown;
} {
  try {
    return JSON.parse(text) as {
      status?: string;
      message?: string;
      code?: SadhanaHistoryErrorCode | 'FORBIDDEN' | 'INVALID_MODE';
      names?: unknown;
      rows?: unknown;
    };
  } catch {
    return {};
  }
}

/**
 * `seeAllSadhanas` — mode `names`: all devotee names (same source as autocomplete).
 */
export async function fetchSeeAllSadhanasNames(
  scriptUrl: string,
  adminKey: string
): Promise<string[]> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'seeAllSadhanas',
      adminKey: adminKey.trim(),
      mode: 'names',
    }),
  });
  const text = await res.text();
  const data = parseJson(text);
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  if (!Array.isArray(data.names)) {
    return [];
  }
  return data.names.filter((n): n is string => typeof n === 'string' && n.trim() !== '');
}

/**
 * `seeAllSadhanas` — mode `lookup`: history rows for one name (no per-user PIN).
 */
export async function fetchSeeAllSadhanasLookup(
  scriptUrl: string,
  adminKey: string,
  name: string
): Promise<SadhanaHistoryRow[]> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'seeAllSadhanas',
      adminKey: adminKey.trim(),
      mode: 'lookup',
      name: name.trim(),
    }),
  });
  const text = await res.text();
  const data = parseJson(text);
  if (!res.ok || data.status === 'error') {
    const err = new Error(data.message || `Request failed (${res.status})`) as Error & {
      code?: string;
    };
    err.code = data.code;
    throw err;
  }
  if (!Array.isArray(data.rows)) {
    return [];
  }
  return data.rows.map((r) => normalizeRow(r as Record<string, unknown>));
}
