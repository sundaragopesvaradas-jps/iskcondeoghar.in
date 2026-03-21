import React from 'react';
import { SADHANA_HISTORY_TABLE_COLUMNS } from './sadhanaHistoryTableConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { sadhanaStrings as t } from './sadhanaStrings';

type Props = {
  rows: SadhanaHistoryRow[];
  /** Admin overview etc. — override empty-state text */
  emptyMessage?: string;
};

export const SadhanaRecordsTable: React.FC<Props> = ({ rows, emptyMessage }) => {
  return (
    <div className="sadhana-records-table-wrap">
      <table className="sadhana-records-table">
        <thead>
          <tr>
            {SADHANA_HISTORY_TABLE_COLUMNS.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={SADHANA_HISTORY_TABLE_COLUMNS.length} className="sadhana-records-empty">
                {emptyMessage ?? t.recordsEmpty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={`${row.Date}-${i}`}>
                {SADHANA_HISTORY_TABLE_COLUMNS.map((col) => (
                  <td key={col}>{row[col] || '—'}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
