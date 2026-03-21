import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../config/routes';
import { fetchSadhanaNameSuggestions } from './fetchSadhanaNameSuggestions';
import { SADHANA_BACKGROUND_CONFIG } from './sadhanaBackgroundConfig';
import { getSadhanaBackgroundImageUrl } from './sadhanaBackground';
import { getSadhanaFontPreset } from './sadhanaTypographyConfig';
import { getSadhanaScriptUrl } from './submitSadhanaResponse';
import { SADHANA_NAME_FIELD_ID, SADHANA_NAMES_SESSION_KEY } from './sadhanaNameFieldConstants';
import { SadhanaHistoryCharts } from './SadhanaHistoryCharts';
import { prepareRowsForChartSeries } from './sadhanaHistoryChartPrep';
import { SadhanaNameCombobox } from './SadhanaNameCombobox';
import { SADHANA_PIN_LENGTH } from './sadhanaPinConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { SadhanaRecordsTable } from './SadhanaRecordsTable';
import { fetchSadhanaHistory, submitSadhanaPinChange } from './sadhanaHistoryApi';
import type { SadhanaHistoryErrorCode } from './sadhanaHistoryApi';
import {
  isDevoteeNameInList,
  resolveCanonicalDevoteeName,
  sortSadhanaHistoryRowsByDate,
} from './sadhanaRecordsUtils';
import { sadhanaStrings as t } from './sadhanaStrings';
import './SadhanaFormPage.css';

const BG = SADHANA_BACKGROUND_CONFIG;

function dedupeSortedNames(arr: string[]): string[] {
  const map = new Map<string, string>();
  for (const n of arr) {
    const s = n.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (!map.has(k)) map.set(k, s);
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'hi'));
}

function readCachedNamesFromSession(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return dedupeSortedNames(p.map((x) => String(x)));
  } catch {
    return [];
  }
}

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

const SadhanaRecordsPage: React.FC = () => {
  const scriptUrl = getSadhanaScriptUrl();
  const backgroundImageUrl = useMemo(() => getSadhanaBackgroundImageUrl(), []);
  const fontPreset = getSadhanaFontPreset();

  const recordsNameId = `${SADHANA_NAME_FIELD_ID}-records-page`;

  const [nameSuggestions, setNameSuggestions] = useState<string[]>(() =>
    typeof window !== 'undefined' ? readCachedNamesFromSession(SADHANA_NAMES_SESSION_KEY) : []
  );

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

  const chartSeries = useMemo(
    () => prepareRowsForChartSeries(rows, { dateOrder: 'newestFirst' }),
    [rows]
  );

  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.getAttribute('lang');
    document.title = t.recordsDocumentTitle;
    document.documentElement.setAttribute('lang', 'hi');
    return () => {
      document.title = prevTitle;
      if (prevLang) document.documentElement.setAttribute('lang', prevLang);
      else document.documentElement.removeAttribute('lang');
    };
  }, []);

  useEffect(() => {
    const id = 'sadhana-records-page-google-font';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = fontPreset.googleFontsHref;
    return () => {
      link?.remove();
    };
  }, [fontPreset.googleFontsHref]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SADHANA_NAMES_SESSION_KEY, JSON.stringify(nameSuggestions));
    } catch {
      /* ignore */
    }
  }, [nameSuggestions]);

  useEffect(() => {
    if (!scriptUrl) return;
    let cancelled = false;
    fetchSadhanaNameSuggestions(scriptUrl)
      .then((names) => {
        if (cancelled) return;
        setNameSuggestions((prev) => dedupeSortedNames([...prev, ...names]));
      })
      .catch(() => {
        /* offline / old script */
      });
    return () => {
      cancelled = true;
    };
  }, [scriptUrl]);

  const pageStyle = useMemo(
    () =>
      ({
        fontFamily: `'${fontPreset.cssFontFamily}', system-ui, -apple-system, 'Segoe UI', sans-serif`,
      }) as React.CSSProperties,
    [fontPreset.cssFontFamily]
  );

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

  const pinDisabled = !nameOk || loading;
  const canSubmitLogin = nameOk && pin.length === SADHANA_PIN_LENGTH && !loading && !!scriptUrl;
  const canSavePin = newPin.length === SADHANA_PIN_LENGTH && !loading && !!scriptUrl;

  return (
    <div className="sadhana-page sadhana-records-page-root" lang="hi" style={pageStyle}>
      <div
        className="sadhana-bg-image"
        style={{
          backgroundImage: `url("${backgroundImageUrl}")`,
          filter: `blur(${BG.blur.initial}px)`,
          transform: 'scale(1.03)',
        }}
        aria-hidden
      />
      <div className="sadhana-bg-gradient" aria-hidden />
      <div className="sadhana-bg-white" style={{ opacity: BG.overlay.initial }} aria-hidden />

      <div className="sadhana-content">
        <main className="sadhana-main sadhana-records-page-main">
          <p className="sadhana-admin-nav">
            <Link to={routes.sadhana} className="sadhana-admin-back-link">
              ← {t.recordsBackToForm}
            </Link>
          </p>

          <h1 className="sadhana-admin-title">{t.recordsTitle}</h1>

          <div className="sadhana-records-page-panel">
            {!scriptUrl ? <p className="sadhana-records-warn">{t.notConfigured}</p> : null}

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
                <label className="sadhana-label sadhana-records-pin-label" htmlFor="sadhana-records-page-pin">
                  <span className="sadhana-label-text">{t.recordsPinLabel}</span>
                </label>
                <input
                  id="sadhana-records-page-pin"
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

                <SadhanaRecordsTable rows={rows} />

                <div className="sadhana-records-change-pin">
                  <h2 className="sadhana-records-subtitle">{t.recordsChangePinSection}</h2>
                  {pinSaveMsg ? <p className="sadhana-records-ok">{pinSaveMsg}</p> : null}
                  <label className="sadhana-label" htmlFor="sadhana-records-page-newpin">
                    <span className="sadhana-label-text">{t.recordsNewPin}</span>
                  </label>
                  <input
                    id="sadhana-records-page-newpin"
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
        </main>
      </div>
    </div>
  );
};

export default SadhanaRecordsPage;
