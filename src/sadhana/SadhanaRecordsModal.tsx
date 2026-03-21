import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { SadhanaHistoryCharts } from './SadhanaHistoryCharts';
import { prepareRowsForChartSeries } from './sadhanaHistoryChartPrep';
import { SadhanaNameCombobox } from './SadhanaNameCombobox';
import { SADHANA_NAME_FIELD_ID } from './sadhanaNameFieldConstants';
import { SADHANA_PIN_LENGTH } from './sadhanaPinConfig';
import { SADHANA_HISTORY_TABLE_COLUMNS } from './sadhanaHistoryTableConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { fetchSadhanaHistory, submitSadhanaPinChange } from './sadhanaHistoryApi';
import type { SadhanaHistoryErrorCode } from './sadhanaHistoryApi';
import {
  isDevoteeNameInList,
  resolveCanonicalDevoteeName,
  sortSadhanaHistoryRowsByDate,
} from './sadhanaRecordsUtils';
import { sadhanaStrings as t } from './sadhanaStrings';

type Props = {
  open: boolean;
  onClose: () => void;
  scriptUrl: string;
  nameSuggestions: string[];
};

function mapErr(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code?: SadhanaHistoryErrorCode }).code;
    if (code) return t.recordsError(code);
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return t.recordsErrorGeneric;
}

export const SadhanaRecordsModal: React.FC<Props> = ({ open, onClose, scriptUrl, nameSuggestions }) => {
  const titleId = useId();
  const recordsNameId = `${SADHANA_NAME_FIELD_ID}-records`;

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [phase, setPhase] = useState<'login' | 'table'>('login');
  const [rows, setRows] = useState<SadhanaHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinSaveMsg, setPinSaveMsg] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  const nameOk = useMemo(() => isDevoteeNameInList(name, nameSuggestions), [name, nameSuggestions]);
  const canonicalName = useMemo(
    () => (nameOk ? resolveCanonicalDevoteeName(name, nameSuggestions) : ''),
    [name, nameOk, nameSuggestions]
  );

  const chartSeries = useMemo(() => prepareRowsForChartSeries(rows), [rows]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setPin('');
    setSessionPin('');
    setPhase('login');
    setRows([]);
    setLoading(false);
    setError(null);
    setPinSaveMsg(null);
    setNewPin('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const inputClass = 'sadhana-input';

  const handleViewRecords = useCallback(async () => {
    if (!scriptUrl || !nameOk || !canonicalName) return;
    setError(null);
    setLoading(true);
    try {
      const data = await fetchSadhanaHistory(scriptUrl, canonicalName, pin);
      setRows(sortSadhanaHistoryRowsByDate(data));
      setSessionPin(pin);
      setPhase('table');
    } catch (e) {
      setError(mapErr(e));
    } finally {
      setLoading(false);
    }
  }, [scriptUrl, nameOk, canonicalName, pin]);

  const handleSaveNewPin = useCallback(async () => {
    if (!scriptUrl || !canonicalName) return;
    if (newPin.length !== SADHANA_PIN_LENGTH || !/^[0-9]+$/.test(newPin)) {
      setError(t.recordsError('INVALID_PIN'));
      return;
    }
    setError(null);
    setPinSaveMsg(null);
    setLoading(true);
    try {
      await submitSadhanaPinChange(scriptUrl, canonicalName, sessionPin, newPin);
      setSessionPin(newPin);
      setNewPin('');
      setPinSaveMsg(t.recordsPinSaved);
    } catch (e) {
      setError(mapErr(e));
    } finally {
      setLoading(false);
    }
  }, [scriptUrl, canonicalName, sessionPin, newPin]);

  const goDifferentName = useCallback(() => {
    setPhase('login');
    setRows([]);
    setPin('');
    setSessionPin('');
    setName('');
    setError(null);
    setPinSaveMsg(null);
    setNewPin('');
  }, []);

  const onPinInput = (v: string) => {
    const only = v.replace(/\D/g, '').slice(0, SADHANA_PIN_LENGTH);
    setPin(only);
  };

  const onNewPin = (v: string) => {
    const only = v.replace(/\D/g, '').slice(0, SADHANA_PIN_LENGTH);
    setNewPin(only);
  };

  if (!open) {
    return null;
  }

  const pinDisabled = !nameOk || loading;
  const canSubmitLogin = nameOk && pin.length === SADHANA_PIN_LENGTH && !loading && !!scriptUrl;
  const canSavePin = newPin.length === SADHANA_PIN_LENGTH && !loading && !!scriptUrl;

  return (
    <div className="sadhana-records-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sadhana-records-modal"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sadhana-records-head">
          <h2 id={titleId} className="sadhana-records-title">
            {t.recordsTitle}
          </h2>
          <button type="button" className="sadhana-records-close" onClick={onClose} aria-label={t.recordsClose}>
            ×
          </button>
        </div>

        {!scriptUrl ? (
          <p className="sadhana-records-warn">{t.notConfigured}</p>
        ) : null}

        {error ? (
          <div className="sadhana-records-error" role="alert">
            {error}
          </div>
        ) : null}

        {phase === 'login' ? (
          <div className="sadhana-records-form">
            <label className="sadhana-label" htmlFor={recordsNameId}>
              <span className="sadhana-label-text">{t.recordsNameLabel}</span>
            </label>
            <SadhanaNameCombobox
              id={recordsNameId}
              value={name}
              onChange={setName}
              suggestions={nameSuggestions}
              disabled={loading || !scriptUrl}
              inputClassName={inputClass}
              listHint={t.nameComboboxListHint}
            />
            <label className="sadhana-label sadhana-records-pin-label" htmlFor="sadhana-records-pin">
              <span className="sadhana-label-text">{t.recordsPinLabel}</span>
            </label>
            <input
              id="sadhana-records-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              value={pin}
              onChange={(e) => onPinInput(e.target.value)}
              disabled={pinDisabled}
              maxLength={SADHANA_PIN_LENGTH}
            />
            <button
              type="button"
              className="sadhana-submit sadhana-records-submit"
              disabled={!canSubmitLogin}
              onClick={handleViewRecords}
            >
              {loading ? t.recordsLoading : t.recordsSubmit}
            </button>
          </div>
        ) : (
          <div className="sadhana-records-body">
            <p className="sadhana-records-who">
              <strong>{canonicalName}</strong>
            </p>

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
                        {t.recordsEmpty}
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

            <div className="sadhana-records-change-pin">
              <h3 className="sadhana-records-subtitle">{t.recordsChangePinSection}</h3>
              {pinSaveMsg ? <p className="sadhana-records-ok">{pinSaveMsg}</p> : null}
              <label className="sadhana-label" htmlFor="sadhana-records-newpin">
                <span className="sadhana-label-text">{t.recordsNewPin}</span>
              </label>
              <input
                id="sadhana-records-newpin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                className={inputClass}
                value={newPin}
                onChange={(e) => onNewPin(e.target.value)}
                disabled={loading}
                maxLength={SADHANA_PIN_LENGTH}
              />
              <button
                type="button"
                className="sadhana-submit sadhana-records-submit"
                disabled={!canSavePin}
                onClick={handleSaveNewPin}
              >
                {loading ? t.recordsLoading : t.recordsSavePin}
              </button>
            </div>

            <SadhanaHistoryCharts series={chartSeries} />

            <div className="sadhana-records-actions">
              <button type="button" className="sadhana-records-secondary" onClick={goDifferentName}>
                {t.recordsDifferentName}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
