/**
 * Pure Sadhana helpers — ported from google-apps-script-sadhana.js.
 */
import { SADHANA_DEFAULT_PIN, SADHANA_PIN_LENGTH } from './sadhanaPinConfig';

export const RESPONSES_TAB = 'Sadhana Responses';
export const UNIQUE_NAMES_TAB = 'Sadhana Unique Names';
export const SADHANA_TABLE_ID = 'sadhana';
export const MAX_HISTORY_ROWS_RETURN = 30;
export const MAX_NAMES_RETURN = 2000;
export const MAX_SHEET_TITLE_LEN = 31;

/** Live sheet / Cosmos column for hearing (Hindi header in migrated data). */
export const HEARING_STORAGE_KEY = 'श्रवणम्';

/** Form field id to Responses column (matches migrated English schema). */
export const FIELD_ID_TO_COLUMN: Record<string, string> = {
  devotee_name: 'Name',
  sadhana_date: 'Date',
  sleep_time_range: 'Sleeping Time',
  wake_time_range: 'Waking up Time',
  mala_count_range: 'Chanting Rounds',
  mala_completed_by_time: 'Chanting Completed',
  sp_books_minutes: 'Book Reading',
  sp_books_which: 'Which Book ?',
  sravanam_duration: HEARING_STORAGE_KEY,
};

export type SadhanaHistoryObj = Record<string, string> & {
  _submissionTimeMs?: number;
};

export function normalizeName(s: unknown): string {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function nameKey(s: unknown): string {
  return normalizeName(s).toLowerCase();
}

function sanitizeSheetTitleChars(name: string): string {
  let out = '';
  for (const ch of name) {
    if (ch === '\\' || ch === '/' || ch === '?' || ch === '*' || ch === '[' || ch === ']') {
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function sheetTitleForDevotee(name: string): string {
  const n = normalizeName(name);
  if (!n) return 'Devotee';
  let t = sanitizeSheetTitleChars(n);
  if (t.length > MAX_SHEET_TITLE_LEN) {
    t = t.substring(0, MAX_SHEET_TITLE_LEN).trim();
  }
  if (!t) return 'Devotee';
  if (nameKey(t) === nameKey(RESPONSES_TAB) || nameKey(t) === nameKey(UNIQUE_NAMES_TAB)) {
    t = (t + '_').substring(0, MAX_SHEET_TITLE_LEN).trim() || 'Devotee_';
  }
  return t;
}

export function pinLen(data: { pinLength?: unknown }): number {
  const n = parseInt(String(data.pinLength ?? ''), 10);
  if (Number.isNaN(n) || n < 4 || n > 12) return SADHANA_PIN_LENGTH;
  return n;
}

export function validatePinFormat(pin: unknown, len: number): boolean {
  const p = String(pin || '').trim();
  if (p.length !== len) return false;
  return /^[0-9]+$/.test(p);
}

export function effectivePin(storedPin: string): string {
  const s = String(storedPin || '').trim();
  return s || SADHANA_DEFAULT_PIN;
}

export function formatCellForDisplay(val: unknown): string {
  if (val == null || val === '') return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

export function historyDateSortKeyFromString(s: string): number {
  const t = String(s || '').trim();
  if (!t) return Number.POSITIVE_INFINITY;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).getTime();
  }
  const parsed = Date.parse(t);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

/** Newest to oldest by Date only; empty dates last. */
export function sortHistoryRowsByDateOnly(rows: SadhanaHistoryObj[]): SadhanaHistoryObj[] {
  if (!rows || rows.length < 2) return rows;
  return rows.slice().sort((a, b) => {
    let ka = historyDateSortKeyFromString(a.Date || '');
    let kb = historyDateSortKeyFromString(b.Date || '');
    if (ka === Number.POSITIVE_INFINITY) ka = Number.NEGATIVE_INFINITY;
    if (kb === Number.POSITIVE_INFINITY) kb = Number.NEGATIVE_INFINITY;
    return kb - ka;
  });
}

export function limitHistoryRowsToMax(rows: SadhanaHistoryObj[]): SadhanaHistoryObj[] {
  if (!rows || rows.length <= MAX_HISTORY_ROWS_RETURN) return rows;
  return rows.slice(-MAX_HISTORY_ROWS_RETURN);
}

function cell(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (key in data && data[key] != null && String(data[key]).trim() !== '') {
      return formatCellForDisplay(data[key]);
    }
  }
  return '';
}

export function dataToHistoryObj(data: Record<string, unknown>): SadhanaHistoryObj {
  const obj: SadhanaHistoryObj = {
    Date: cell(data, 'Date'),
    'Sleeping Time': cell(data, 'Sleeping Time'),
    'Waking up Time': cell(data, 'Waking up Time'),
    'Chanting Rounds': cell(data, 'Chanting Rounds'),
    'Chanting Completed': cell(data, 'Chanting Completed'),
    'Book Reading': cell(data, 'Book Reading'),
    'Which Book ?': cell(data, 'Which Book ?'),
    Hearing: cell(data, 'Hearing', HEARING_STORAGE_KEY),
  };
  const ts = data.Timestamp;
  if (ts instanceof Date && !Number.isNaN(ts.getTime())) {
    obj._submissionTimeMs = ts.getTime();
  } else if (typeof ts === 'string' && ts.trim()) {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) obj._submissionTimeMs = parsed;
  }
  return obj;
}

export function formatResponseValue(v: unknown): string {
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return v == null ? '' : String(v);
}

export function buildResponseData(input: {
  fieldOrder?: string[];
  labels?: Record<string, string>;
  responses?: Record<string, unknown>;
}): Record<string, string> {
  const responses = input.responses || {};
  const fieldOrder = input.fieldOrder || Object.keys(FIELD_ID_TO_COLUMN);
  const data: Record<string, string> = {
    Timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  for (const id of fieldOrder) {
    const col = FIELD_ID_TO_COLUMN[id] || input.labels?.[id] || id;
    data[col] = formatResponseValue(responses[id]);
  }

  for (const [id, col] of Object.entries(FIELD_ID_TO_COLUMN)) {
    if (!(col in data) && id in responses) {
      data[col] = formatResponseValue(responses[id]);
    }
  }

  return data;
}
