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
  if (rows.length === 0) {
    return (
      <div className="sadhana-records-table-wrap">
        <table className="sadhana-records-table sadhana-records-table--pivot">
          <tbody>
            <tr>
              <td className="sadhana-records-empty">{emptyMessage ?? t.recordsEmpty}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="sadhana-records-table-wrap">
      <table className="sadhana-records-table sadhana-records-table--pivot">
        <tbody>
          {SADHANA_HISTORY_TABLE_COLUMNS.map((field) => (
            <tr key={field}>
              <th scope="row">{field}</th>
              {rows.map((row, ri) => (
                <td key={ri}>{row[field] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
