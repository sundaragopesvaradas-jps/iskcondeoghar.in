/**
 * Past-record table: column order and headers shown to users (English).
 * Backend (Apps Script) maps Hindi sheet headers to these keys.
 */
export const SADHANA_HISTORY_TABLE_COLUMNS = [
  'Date',
  'Sleeping Time',
  'Waking up Time',
  'Chanting Rounds',
  'Chanting Completed',
  'Book Reading',
  'Which Book ?',
  'Hearing',
] as const;

export type SadhanaHistoryRow = Record<(typeof SADHANA_HISTORY_TABLE_COLUMNS)[number], string> & {
  /** Set by Google Apps Script from sheet Timestamp for same-date deduplication */
  _submissionTimeMs?: number;
};
