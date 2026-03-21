import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sadhanaFormFields } from './sadhanaFormConfig';
import { getSadhanaScriptUrl, submitSadhanaResponse } from './submitSadhanaResponse';
import { SADHANA_BACKGROUND_CONFIG } from './sadhanaBackgroundConfig';
import { getSadhanaBackgroundImageUrl } from './sadhanaBackground';
import { sadhanaStrings as t } from './sadhanaStrings';
import { countCompletedRequired, isFieldRequired, isFieldVisible } from './sadhanaFormUtils';
import iskconDeogharLogo from '../assets/images/iskcon-logo.png';
import srilaPrabhupadaLogo from '../assets/images/sp.jpg';
import './SadhanaFormPage.css';

const FORM_ID = 'sadhana-v2-hi';
const BG = SADHANA_BACKGROUND_CONFIG;

type FieldDef = (typeof sadhanaFormFields)[number];

const QUESTIONS_PER_GROUP = 2;

function chunkFields(fields: FieldDef[], size: number): FieldDef[][] {
  const groups: FieldDef[][] = [];
  for (let i = 0; i < fields.length; i += size) {
    groups.push(fields.slice(i, i + size));
  }
  return groups;
}

function emptyValueForField(f: FieldDef): string | boolean | string[] {
  if (f.type === 'checkbox') {
    return f.options && f.options.length > 0 ? [] : false;
  }
  if (f.type === 'radio' || f.type === 'date' || f.type === 'text') {
    return '';
  }
  return '';
}

const SadhanaFormPage: React.FC = () => {
  const scriptUrl = getSadhanaScriptUrl();
  const backgroundImageUrl = useMemo(() => getSadhanaBackgroundImageUrl(), []);
  const alertsRef = useRef<HTMLDivElement>(null);

  const [bgBlur, setBgBlur] = useState<number>(BG.blur.initial);
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(BG.overlay.initial);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(BG.imageOpacity.initial);

  const [values, setValues] = useState<Record<string, string | boolean | string[]>>(() => {
    const init: Record<string, string | boolean | string[]> = {};
    sadhanaFormFields.forEach((f) => {
      init[f.id] = emptyValueForField(f);
    });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    sadhanaFormFields.forEach((f) => {
      m[f.id] = f.label;
    });
    return m;
  }, []);

  const fieldOrder = useMemo(() => sadhanaFormFields.map((f) => f.id), []);

  const fieldGroups = useMemo(
    () => chunkFields(sadhanaFormFields, QUESTIONS_PER_GROUP),
    []
  );

  const { done: filledRequiredCount, total: requiredTotal } = useMemo(
    () => countCompletedRequired(sadhanaFormFields, values),
    [values]
  );

  const progressPct = requiredTotal > 0 ? Math.round((filledRequiredCount / requiredTotal) * 100) : 0;

  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.getAttribute('lang');
    document.title = t.documentTitle;
    document.documentElement.setAttribute('lang', 'hi');
    return () => {
      document.title = prevTitle;
      if (prevLang) document.documentElement.setAttribute('lang', prevLang);
      else document.documentElement.removeAttribute('lang');
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
        const easingSpan = maxScroll * BG.scrollEasingMultiplier;
        const raw = Math.min(1, Math.max(0, window.scrollY / easingSpan));
        const progress = raw * raw * (3 - 2 * raw);

        const blurRange = BG.blur.initial - BG.blur.final;
        setBgBlur(BG.blur.initial - progress * blurRange);

        const overlayRange = BG.overlay.initial - BG.overlay.final;
        setBgOverlayOpacity(BG.overlay.initial - progress * overlayRange);

        const imageOpacityRange = BG.imageOpacity.initial - BG.imageOpacity.final;
        setBgImageOpacity(BG.imageOpacity.initial - progress * imageOpacityRange);

        rafId = 0;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    const id = window.setTimeout(() => setCelebrate(false), 2800);
    return () => window.clearTimeout(id);
  }, [celebrate]);

  useEffect(() => {
    if (!message) return;
    const el = alertsRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }, [message]);

  useEffect(() => {
    const m = values.sp_books_minutes;
    if (m !== '0' && m !== '') return;
    setValues((prev) => {
      const cur = prev.sp_books_which;
      if (!Array.isArray(cur) || cur.length === 0) return prev;
      return { ...prev, sp_books_which: [] };
    });
  }, [values.sp_books_minutes]);

  const setText = (id: string, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  };

  const setBool = (id: string, v: boolean) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  };

  const toggleMulti = (id: string, option: string, checked: boolean) => {
    setValues((prev) => {
      const cur = prev[id];
      const arr = Array.isArray(cur) ? [...cur] : [];
      if (checked) {
        if (arr.indexOf(option) === -1) arr.push(option);
      } else {
        const i = arr.indexOf(option);
        if (i !== -1) arr.splice(i, 1);
      }
      return { ...prev, [id]: arr };
    });
  };

  const validate = (): string | null => {
    for (const f of sadhanaFormFields) {
      if (!isFieldRequired(f, values)) continue;
      const v = values[f.id];
      if ((f.type === 'text' || f.type === 'date') && (!v || String(v).trim() === '')) {
        return t.validateText(f.label);
      }
      if (f.type === 'radio' && (!v || String(v).trim() === '')) {
        return t.validateRadio(f.label);
      }
      if (f.type === 'checkbox') {
        if (f.options && f.options.length > 0) {
          if (!Array.isArray(v) || v.length === 0) {
            return t.validateCheckboxMulti(f.label);
          }
        } else if (v !== true) {
          return t.validateCheckboxSingle(f.label);
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const err = validate();
    if (err) {
      setMessage({ type: 'err', text: err });
      return;
    }
    if (!scriptUrl) {
      setMessage({ type: 'err', text: t.notConfigured });
      return;
    }
    setSubmitting(true);
    try {
      await submitSadhanaResponse(scriptUrl, {
        action: 'SADHANA_SUBMIT',
        formId: FORM_ID,
        fieldOrder,
        labels,
        responses: values,
      });
      setMessage({ type: 'ok', text: t.success });
      setCelebrate(true);
      const reset: Record<string, string | boolean | string[]> = {};
      sadhanaFormFields.forEach((f) => {
        reset[f.id] = emptyValueForField(f);
      });
      setValues(reset);
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : t.genericError;
      setMessage({ type: 'err', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasValue: boolean) =>
    `sadhana-input${hasValue ? ' filled' : ''}`;

  return (
    <div className={`sadhana-page${celebrate ? ' sadhana-page--celebrate' : ''}`} lang="hi">
      <div
        className="sadhana-bg-image"
        style={{
          backgroundImage: `url("${backgroundImageUrl}")`,
          filter: `blur(${bgBlur}px)`,
          transform: 'scale(1.03)',
          opacity: bgImageOpacity,
        }}
        aria-hidden
      />
      <div className="sadhana-bg-gradient" aria-hidden />
      <div
        className="sadhana-bg-white"
        style={{ opacity: bgOverlayOpacity }}
        aria-hidden
      />

      <div className="sadhana-content">
        <div className="sadhana-stage">
          <aside className="sadhana-side sadhana-side--left" aria-hidden>
            <div className="sadhana-side__inner">
              <p className="sadhana-side__mantra">{t.hareKrishnaMahamantra}</p>
            </div>
          </aside>
          <main className="sadhana-main">
            <div className={`sadhana-hero${celebrate ? ' sadhana-hero--pulse' : ''}`}>
              <div className="sadhana-hero__row">
                <span className="sadhana-hero__logo-frame sadhana-hero__logo-frame--iskcon">
                  <img
                    src={iskconDeogharLogo}
                    alt="ISKCON देवघर"
                    className="sadhana-hero__logo sadhana-hero__logo--iskcon"
                    decoding="async"
                  />
                </span>
                <h1 className="sadhana-hero__title">{t.heroTitle}</h1>
                <span className="sadhana-hero__logo-frame sadhana-hero__logo-frame--sp">
                  <img
                    src={srilaPrabhupadaLogo}
                    alt="श्रील प्रभुपाद"
                    className="sadhana-hero__logo sadhana-hero__logo--sp"
                    decoding="async"
                  />
                </span>
              </div>
              {t.heroSubtitle ? <p>{t.heroSubtitle}</p> : null}
            </div>

            <div ref={alertsRef} className="sadhana-alerts">
              {!scriptUrl && (
                <div className="sadhana-banner warn">
                  {t.devBannerBeforeCode}{' '}
                  <code className="sadhana-code">sadhanaBackendConfig.ts</code>{' '}
                  {t.devBannerAfterCode}
                </div>
              )}

              {message && (
                <div className={`sadhana-banner ${message.type === 'ok' ? 'ok' : 'err'}`}>{message.text}</div>
              )}
            </div>

            <form className="sadhana-form" onSubmit={handleSubmit} noValidate>
              {fieldGroups.map((group, groupIndex) => {
                const visible = group.filter((f) => isFieldVisible(f, values));
                return (
                <section
                  key={groupIndex}
                  style={{ ['--g' as string]: groupIndex } as React.CSSProperties}
                  className={`sadhana-group sadhana-group--${groupIndex % 4} sadhana-group--enter`}
                  aria-label={`फ़ॉर्म खंड ${groupIndex + 1}`}
                >
                  {visible.map((f) => (
                    <div
                      key={f.id}
                      className={`sadhana-field-block${visible.length === 1 ? ' sadhana-field-block--full' : ''}`}
                    >
                      <div className="sadhana-question">
                        {f.type === 'text' || f.type === 'date' ? (
                          <label className="sadhana-label" htmlFor={f.id} id={`${f.id}-label`}>
                            <span className="sadhana-label-text">
                              {f.label}
                              {isFieldRequired(f, values) ? <span className="sadhana-required" aria-hidden> *</span> : null}
                            </span>
                          </label>
                        ) : (
                          <div className="sadhana-label" id={`${f.id}-label`}>
                            <span className="sadhana-label-text">
                              {f.label}
                              {isFieldRequired(f, values) ? <span className="sadhana-required" aria-hidden> *</span> : null}
                            </span>
                          </div>
                        )}
                        {f.description ? <p className="sadhana-hint">{f.description}</p> : null}
                      </div>

                      <div className="sadhana-answer">
                        {f.type === 'text' && (
                          <input
                            id={f.id}
                            type="text"
                            autoComplete="name"
                            className={inputClass(!!values[f.id] && String(values[f.id]).trim() !== '')}
                            value={String(values[f.id] ?? '')}
                            onChange={(e) => setText(f.id, e.target.value)}
                          />
                        )}

                        {f.type === 'date' && (
                          <div className="sadhana-input-date-wrap">
                            <input
                              id={f.id}
                              type="date"
                              className={inputClass(!!values[f.id] && String(values[f.id]).trim() !== '')}
                              value={String(values[f.id] ?? '')}
                              onChange={(e) => setText(f.id, e.target.value)}
                            />
                          </div>
                        )}

                        {f.type === 'radio' && f.options && (
                          <div className="sadhana-options-panel" role="radiogroup" aria-labelledby={`${f.id}-label`}>
                            {f.options.map((opt) => (
                              <label
                                key={opt}
                                className={`sadhana-option-row${values[f.id] === opt ? ' sadhana-option-row--active' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={f.id}
                                  checked={values[f.id] === opt}
                                  onChange={() => setText(f.id, opt)}
                                />
                                <span className="sadhana-option-text">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {f.type === 'checkbox' && (!f.options || f.options.length === 0) && (
                          <div className="sadhana-options-panel sadhana-options-panel--single">
                            <label className="sadhana-option-row">
                              <input
                                type="checkbox"
                                checked={values[f.id] === true}
                                onChange={(e) => setBool(f.id, e.target.checked)}
                              />
                              <span className="sadhana-option-text">{t.checkboxYes}</span>
                            </label>
                          </div>
                        )}

                        {f.type === 'checkbox' && f.options && f.options.length > 0 && (
                          <div className="sadhana-options-panel" role="group" aria-labelledby={`${f.id}-label`}>
                            {f.options.map((opt) => {
                              const cur = values[f.id];
                              const selected = Array.isArray(cur) && cur.indexOf(opt) !== -1;
                              return (
                                <label
                                  key={opt}
                                  className={`sadhana-option-row${selected ? ' sadhana-option-row--active' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => toggleMulti(f.id, opt, e.target.checked)}
                                  />
                                  <span className="sadhana-option-text">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
                );
              })}

              <div className="sadhana-form-footer">
                <div className="sadhana-progress-wrap sadhana-progress-wrap--bottom">
                  <div className="sadhana-progress-head">
                    <span className="sadhana-progress-count">
                      {t.progressFilled(filledRequiredCount, requiredTotal)}
                    </span>
                  </div>
                  <div
                    className="sadhana-progress-track"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t.progressFilled(filledRequiredCount, requiredTotal)}
                    aria-valuetext={t.progressFilled(filledRequiredCount, requiredTotal)}
                  >
                    <div className="sadhana-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <div className="sadhana-actions">
                  <button type="submit" className="sadhana-submit" disabled={submitting || !scriptUrl}>
                    {submitting ? t.submitting : t.submit}
                  </button>
                </div>
              </div>
            </form>
          </main>
          <aside className="sadhana-side sadhana-side--right" aria-hidden>
            <div className="sadhana-side__inner">
              <p className="sadhana-side__mantra">{t.hareKrishnaMahamantra}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SadhanaFormPage;
