import { SADHANA_PIN_LENGTH } from './sadhanaPinConfig';
import { SADHANA_HISTORY_TABLE_COLUMNS } from './sadhanaHistoryTableConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';

export type SadhanaHistoryErrorCode =
  | 'WRONG_PIN'
  | 'NAME_NOT_FOUND'
  | 'INVALID_PIN'
  | 'NAME_REQUIRED'
  | 'PIN_UNCHANGED'
  | 'UNKNOWN_ACTION'
  | 'SERVER_ERROR';

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

function parseJsonResponse(text: string): {
  status?: string;
  message?: string;
  code?: SadhanaHistoryErrorCode;
  rows?: unknown;
} {
  try {
    return JSON.parse(text) as {
      status?: string;
      message?: string;
      code?: SadhanaHistoryErrorCode;
      rows?: unknown;
    };
  } catch {
    return {};
  }
}

export async function fetchSadhanaHistory(
  scriptUrl: string,
  name: string,
  pin: string
): Promise<SadhanaHistoryRow[]> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'SADHANA_LOOKUP',
      name: name.trim(),
      pin,
      pinLength: SADHANA_PIN_LENGTH,
    }),
  });

  const text = await res.text();
  const data = parseJsonResponse(text);

  if (!res.ok || data.status === 'error') {
    const err = new Error(data.message || `Request failed (${res.status})`) as Error & {
      code?: SadhanaHistoryErrorCode;
    };
    err.code = data.code;
    throw err;
  }

  if (!Array.isArray(data.rows)) {
    return [];
  }

  return data.rows.map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function submitSadhanaPinChange(
  scriptUrl: string,
  name: string,
  oldPin: string,
  newPin: string
): Promise<void> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'SADHANA_CHANGE_PIN',
      name: name.trim(),
      oldPin,
      newPin,
      pinLength: SADHANA_PIN_LENGTH,
    }),
  });

  const text = await res.text();
  const data = parseJsonResponse(text);

  if (!res.ok || data.status === 'error') {
    const err = new Error(data.message || `Request failed (${res.status})`) as Error & {
      code?: SadhanaHistoryErrorCode;
    };
    err.code = data.code;
    throw err;
  }
}
