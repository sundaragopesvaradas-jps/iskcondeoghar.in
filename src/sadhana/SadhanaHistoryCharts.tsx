import React, { useMemo } from 'react';
import {
  SADHANA_OPTION_ORDER_BY_CHART_COLUMN,
  SADHANA_HISTORY_CHART_COLUMNS,
} from './sadhanaFormConfig';
import type { SadhanaHistoryChartColumnKey } from './sadhanaFormConfig';
import type { SadhanaHistoryRow } from './sadhanaHistoryTableConfig';
import { sadhanaStrings as t } from './sadhanaStrings';

type Props = {
  series: SadhanaHistoryRow[];
};

/** Wide left margin for Hindi Y-axis labels */
const W = 420;
const H = 200;
const PAD = { L: 108, R: 10, T: 10, B: 36 };

function truncateYLabel(s: string, maxChars: number): string {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function ordinalIndex(options: readonly string[], value: string): number {
  const v = value.trim();
  if (!v) return -1;
  return options.findIndex((o) => o.trim() === v);
}

function buildPointCoords(
  series: SadhanaHistoryRow[],
  column: SadhanaHistoryChartColumnKey,
  options: readonly string[]
): { x: number; y: number; date: string; label: string; yi: number }[] {
  const innerW = W - PAD.L - PAD.R;
  const innerH = H - PAD.T - PAD.B;
  const n = series.length;
  const denomY = Math.max(1, options.length - 1);
  const pts: { x: number; y: number; date: string; label: string; yi: number }[] = [];
  for (let i = 0; i < n; i++) {
    const row = series[i];
    const raw = row[column] || '';
    const yi = ordinalIndex(options, raw);
    if (yi < 0) continue;
    const xRatio = n <= 1 ? 0.5 : i / (n - 1);
    const x = PAD.L + xRatio * innerW;
    const ySvg = PAD.T + innerH - (yi / denomY) * innerH;
    pts.push({
      x,
      y: ySvg,
      date: (row.Date || '').trim(),
      label: raw.trim(),
      yi,
    });
  }
  return pts;
}

function SadhanaOrdinalChart({
  column,
  series,
}: {
  column: SadhanaHistoryChartColumnKey;
  series: SadhanaHistoryRow[];
}) {
  const options = SADHANA_OPTION_ORDER_BY_CHART_COLUMN[column];
  const pts = useMemo(() => buildPointCoords(series, column, options), [series, column, options]);

  const segments = useMemo(() => {
    if (pts.length < 2) return [] as string[];
    return [pts.map((p) => `${p.x},${p.y}`).join(' ')];
  }, [pts]);

  const yLabelIndices = useMemo(() => {
    const set = new Set<number>();
    for (const p of pts) {
      set.add(p.yi);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [pts]);

  const innerH = H - PAD.T - PAD.B;
  const denomY = Math.max(1, options.length - 1);
  const yLow = PAD.T + innerH;
  const yHigh = PAD.T;

  return (
    <div className="sadhana-chart-card">
      <h4 className="sadhana-chart-card__title">{column}</h4>
      {pts.length === 0 ? (
        <p className="sadhana-chart-card__empty">{t.recordsChartNoData}</p>
      ) : (
        <svg
          className="sadhana-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t.recordsChartAria(column)}
        >
          <line
            x1={PAD.L}
            y1={yLow}
            x2={PAD.L}
            y2={yHigh}
            className="sadhana-chart-svg__axis"
          />
          <line
            x1={PAD.L}
            y1={yLow}
            x2={W - PAD.R}
            y2={yLow}
            className="sadhana-chart-svg__axis"
          />
          {yLabelIndices.map((yi) => {
            const ySvg = PAD.T + innerH - (yi / denomY) * innerH;
            const full = options[yi] || '';
            const shown = truncateYLabel(full, 42);
            return (
              <g key={`y-${yi}`}>
                <title>{full}</title>
                <text
                  x={PAD.L - 6}
                  y={ySvg}
                  className="sadhana-chart-svg__y-label"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {shown}
                </text>
              </g>
            );
          })}
          {segments.map((s, si) => (
            <polyline
              key={si}
              fill="none"
              className="sadhana-chart-svg__line"
              points={s}
              strokeWidth={2}
            />
          ))}
          {pts.map((p, i) => (
            <circle key={`${p.date}-${i}`} cx={p.x} cy={p.y} r={4} className="sadhana-chart-svg__dot">
              <title>{`${p.date}: ${p.label}`}</title>
            </circle>
          ))}
          {pts.map((p, i) => {
            const step = Math.max(1, Math.ceil(pts.length / 10));
            if (i % step !== 0 && i !== pts.length - 1) return null;
            return (
              <text
                key={`lab-${p.date}-${i}`}
                x={p.x}
                y={H - 6}
                className="sadhana-chart-svg__x-label"
                textAnchor="middle"
              >
                {p.date.length >= 10 ? p.date.slice(5) : p.date}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export const SadhanaHistoryCharts: React.FC<Props> = ({ series }) => {
  if (series.length === 0) {
    return null;
  }

  return (
    <section className="sadhana-records-charts" aria-label={t.recordsChartsHeading}>
      <h3 className="sadhana-records-subtitle">{t.recordsChartsHeading}</h3>
      <p className="sadhana-records-charts-hint">{t.recordsChartsHint}</p>
      <div className="sadhana-records-charts-grid">
        {SADHANA_HISTORY_CHART_COLUMNS.map((col) => (
          <SadhanaOrdinalChart key={col} column={col} series={series} />
        ))}
      </div>
    </section>
  );
};
