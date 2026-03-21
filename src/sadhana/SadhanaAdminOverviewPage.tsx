import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../config/routes';
import { SADHANA_BACKGROUND_CONFIG } from './sadhanaBackgroundConfig';
import { getSadhanaBackgroundImageUrl } from './sadhanaBackground';
import { getSadhanaFontPreset } from './sadhanaTypographyConfig';
import { getSadhanaScriptUrl } from './submitSadhanaResponse';
import { fetchSeeAllSadhanasLookup, fetchSeeAllSadhanasNames } from './sadhanaAdminApi';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { prepareRowsForChartSeries } from './sadhanaHistoryChartPrep';
import { SadhanaHistoryCharts } from './SadhanaHistoryCharts';
import { SadhanaRecordsTable } from './SadhanaRecordsTable';
import { sortSadhanaHistoryRowsByDateOrder } from './sadhanaRecordsUtils';
import { sadhanaStrings as t } from './sadhanaStrings';
import './SadhanaFormPage.css';

const BG = SADHANA_BACKGROUND_CONFIG;
const ADMIN_KEY_STORAGE = 'sadhana_admin_key';

function mapAdminErr(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code?: string }).code;
    if (code === 'FORBIDDEN') return t.adminErrorForbidden;
    if (code === 'INVALID_MODE') return t.adminErrorInvalidMode;
    if (code) return t.adminRecordsError(code);
  }
  if (e instanceof Error && e.message) return e.message;
  return t.adminErrorGeneric;
}

const SadhanaAdminOverviewPage: React.FC = () => {
  const scriptUrl = getSadhanaScriptUrl();
  const backgroundImageUrl = useMemo(() => getSadhanaBackgroundImageUrl(), []);
  const fontPreset = getSadhanaFontPreset();

  const [adminKeyInput, setAdminKeyInput] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [names, setNames] = useState<string[]>([]);
  const [phase, setPhase] = useState<'gate' | 'list' | 'detail'>('gate');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [rows, setRows] = useState<SadhanaHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartSeries = useMemo(
    () => prepareRowsForChartSeries(rows, { dateOrder: 'oldestFirst' }),
    [rows]
  );

  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.getAttribute('lang');
    document.title = t.adminDocumentTitle;
    document.documentElement.setAttribute('lang', 'en');
    return () => {
      document.title = prevTitle;
      if (prevLang) document.documentElement.setAttribute('lang', prevLang);
      else document.documentElement.removeAttribute('lang');
    };
  }, []);

  useEffect(() => {
    const id = 'sadhana-admin-google-font';
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

  const tryLoadNames = useCallback(
    async (key: string) => {
      if (!scriptUrl) {
        setError(t.adminNotConfigured);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const list = await fetchSeeAllSadhanasNames(scriptUrl, key);
        try {
          sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
        } catch {
          /* ignore */
        }
        setAdminKeyInput(key.trim());
        setNames(list);
        setPhase('list');
        setSelectedName(null);
        setRows([]);
      } catch (e) {
        setError(mapAdminErr(e));
        try {
          sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
      }
    },
    [scriptUrl]
  );

  useEffect(() => {
    let cancelled = false;
    const k = (() => {
      try {
        return sessionStorage.getItem(ADMIN_KEY_STORAGE)?.trim() || '';
      } catch {
        return '';
      }
    })();
    if (!k || !scriptUrl) return;
    setLoading(true);
    setError(null);
    fetchSeeAllSadhanasNames(scriptUrl, k)
      .then((list) => {
        if (cancelled) return;
        setAdminKeyInput(k);
        setNames(list);
        setPhase('list');
        setSelectedName(null);
        setRows([]);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(mapAdminErr(e));
        try {
          sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scriptUrl]);

  const goChangeKey = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setPhase('gate');
    setNames([]);
    setSelectedName(null);
    setRows([]);
    setError(null);
  }, []);

  const openName = useCallback(
    async (name: string) => {
      if (!scriptUrl) return;
      setError(null);
      setLoading(true);
      setSelectedName(name);
      setPhase('detail');
      try {
        const raw = await fetchSeeAllSadhanasLookup(scriptUrl, adminKeyInput, name);
        setRows(sortSadhanaHistoryRowsByDateOrder(raw, 'oldestFirst'));
      } catch (e) {
        setError(mapAdminErr(e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [scriptUrl, adminKeyInput]
  );

  const backToList = useCallback(() => {
    setPhase('list');
    setSelectedName(null);
    setRows([]);
    setError(null);
  }, []);

  const pageStyle = useMemo(
    () =>
      ({
        fontFamily: `'${fontPreset.cssFontFamily}', system-ui, -apple-system, 'Segoe UI', sans-serif`,
      }) as React.CSSProperties,
    [fontPreset.cssFontFamily]
  );

  return (
    <div className="sadhana-page sadhana-admin-page" lang="en" style={pageStyle}>
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
        <main className="sadhana-main sadhana-admin-main">
          <p className="sadhana-admin-nav">
            <Link to={routes.sadhana} className="sadhana-admin-back-link">
              ← {t.adminBackToForm}
            </Link>
          </p>

          <h1 className="sadhana-admin-title">{t.adminPageTitle}</h1>

          {!scriptUrl ? <p className="sadhana-records-warn">{t.adminNotConfigured}</p> : null}

          {error ? (
            <div className="sadhana-records-error" role="alert">
              {error}
            </div>
          ) : null}

          {phase === 'gate' ? (
            <div className="sadhana-admin-gate">
              <label className="sadhana-label" htmlFor="sadhana-admin-key">
                <span className="sadhana-label-text">{t.adminKeyLabel}</span>
              </label>
              <input
                id="sadhana-admin-key"
                type="password"
                autoComplete="off"
                className="sadhana-input"
                placeholder={t.adminKeyPlaceholder}
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                disabled={loading || !scriptUrl}
              />
              <button
                type="button"
                className="sadhana-submit sadhana-records-submit"
                disabled={loading || !scriptUrl || !adminKeyInput.trim()}
                onClick={() => tryLoadNames(adminKeyInput)}
              >
                {loading ? t.recordsLoading : t.adminLoadNames}
              </button>
            </div>
          ) : null}

          {phase === 'list' || phase === 'detail' ? (
            <>
              <div className="sadhana-admin-list">
                <div className="sadhana-admin-list-toolbar">
                  <h2 className="sadhana-admin-subtitle">{t.adminNamesHeading}</h2>
                  <div className="sadhana-admin-list-actions">
                    {phase === 'detail' ? (
                      <button type="button" className="sadhana-admin-text-btn" onClick={backToList} disabled={loading}>
                        {t.adminBackToNames}
                      </button>
                    ) : null}
                    <button type="button" className="sadhana-admin-text-btn" onClick={goChangeKey}>
                      {t.adminChangeKey}
                    </button>
                  </div>
                </div>
                <div className="sadhana-admin-name-grid" role="list">
                  {names.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`sadhana-admin-name-btn${
                        phase === 'detail' && selectedName === n ? ' sadhana-admin-name-btn--active' : ''
                      }`}
                      onClick={() => openName(n)}
                      disabled={loading}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {phase === 'detail' && selectedName ? (
                <div className="sadhana-admin-detail">
                  <p className="sadhana-records-who">
                    <strong>{selectedName}</strong>
                  </p>
                  {loading ? <p className="sadhana-admin-loading">{t.recordsLoading}</p> : null}
                  <SadhanaRecordsTable rows={rows} emptyMessage={t.adminRecordsEmpty} />
                  <SadhanaHistoryCharts
                    series={chartSeries}
                    copy={{
                      chartsHeading: t.adminChartsHeading,
                      chartsHint: t.adminChartsHint,
                      chartNoData: t.adminChartNoData,
                      chartAria: t.adminChartAria,
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default SadhanaAdminOverviewPage;
