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
  /** Admin overview (English) — overrides default Hindi copy */
  copy?: {
    chartsHeading: string;
    chartsHint: string;
    chartNoData: string;
    chartAria: (columnTitle: string) => string;
  };
};

/** Default inner plot width (bars); grows when many points so every x-label fits */
const BASE_INNER_W = 420 - 108 - 10 - 14;
/** Minimum horizontal space per bar column (bar + vertical date label footprint) */
const MIN_INNER_W_PER_POINT = 9;

/** Chart width = left pad + right pad + plot inset + inner data width */
const H = 238;
const PAD = { L: 108, R: 10, T: 10, B: 62 };

/** Inset bars / x-positions from the y-axis so the first column does not overlap it */
const PLOT_PAD_L = 14;
/** Bottom: lowest ordinal sits above the x-axis (not flush like “0”) */
const PLOT_PAD_B = 18;
/** Top: keeps the highest ordinal slightly below the chart top */
const PLOT_PAD_T = 8;

/** Gap between adjacent bars (px) */
const BAR_GAP = 1;

function computeInnerWData(nPoints: number): number {
  if (nPoints <= 0) return BASE_INNER_W;
  const needed = nPoints * MIN_INNER_W_PER_POINT + (nPoints - 1) * BAR_GAP;
  return Math.max(BASE_INNER_W, needed);
}

function chartWidthFromInner(innerWData: number): number {
  return PAD.L + PAD.R + PLOT_PAD_L + innerWData;
}

function chartPlotGeom(optionsLength: number, innerWData: number) {
  const innerH = H - PAD.T - PAD.B;
  const yLow = PAD.T + innerH;
  const yPlotTop = PAD.T + PLOT_PAD_T;
  const yPlotBottom = yLow - PLOT_PAD_B;
  const plotH = Math.max(1, yPlotBottom - yPlotTop);
  const denomY = Math.max(1, optionsLength - 1);
  const chartW = chartWidthFromInner(innerWData);
  return { innerH, yLow, yPlotTop, yPlotBottom, plotH, denomY, innerWData, chartW };
}

function yFromOrdinal(yi: number, geom: ReturnType<typeof chartPlotGeom>): number {
  return geom.yPlotBottom - (yi / geom.denomY) * geom.plotH;
}

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** X-axis: e.g. `2025-03-22` → `22-March` */
function formatChartAxisDate(dateStr: string): string {
  const t = dateStr.trim();
  if (!t) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(t);
  if (iso) {
    const d = parseInt(iso[3], 10);
    const m = parseInt(iso[2], 10) - 1;
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      return `${d}-${MONTH_NAMES_EN[m]}`;
    }
  }
  const loose = Date.parse(t);
  if (!Number.isNaN(loose)) {
    const dt = new Date(loose);
    return `${dt.getDate()}-${MONTH_NAMES_EN[dt.getMonth()]}`;
  }
  return t;
}

const BAR_W_MAX = 32;
const BAR_W_MIN = 1;

function packedBarLayout(
  n: number,
  innerWData: number
): { barWidth: number; centers: number[] } {
  if (n <= 0) return { barWidth: 0, centers: [] };
  const base = PAD.L + PLOT_PAD_L;
  if (n === 1) {
    const w = Math.min(BAR_W_MAX, Math.max(BAR_W_MIN, innerWData * 0.45));
    return { barWidth: w, centers: [base + innerWData / 2] };
  }
  const wRaw = (innerWData - (n - 1) * BAR_GAP) / n;
  const barWidth = Math.min(BAR_W_MAX, Math.max(BAR_W_MIN, wRaw));
  const used = n * barWidth + (n - 1) * BAR_GAP;
  const start = base + (innerWData - used) / 2;
  const centers: number[] = [];
  for (let i = 0; i < n; i++) {
    centers.push(start + barWidth / 2 + i * (barWidth + BAR_GAP));
  }
  return { barWidth, centers };
}

function truncateYLabel(s: string, maxChars: number): string {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function normalizeOptionLabel(s: string): string {
  return s.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function ordinalIndex(options: readonly string[], value: string): number {
  const v = normalizeOptionLabel(value);
  if (!v) return -1;
  let i = options.findIndex((o) => normalizeOptionLabel(o) === v);
  if (i >= 0) return i;
  return options.findIndex((o) => normalizeOptionLabel(o).localeCompare(v, 'hi') === 0);
}

function buildPointCoords(
  series: SadhanaHistoryRow[],
  column: SadhanaHistoryChartColumnKey,
  options: readonly string[]
): { x: number; y: number; date: string; label: string; yi: number }[] {
  const raw: { y: number; date: string; label: string; yi: number }[] = [];
  for (let i = 0; i < series.length; i++) {
    const row = series[i];
    const rawVal = row[column] || '';
    const yi = ordinalIndex(options, rawVal);
    if (yi < 0) continue;
    raw.push({
      y: 0,
      date: (row.Date || '').trim(),
      label: rawVal.trim(),
      yi,
    });
  }
  const innerW = computeInnerWData(raw.length);
  const geom = chartPlotGeom(options.length, innerW);
  for (const p of raw) {
    p.y = yFromOrdinal(p.yi, geom);
  }
  const { centers } = packedBarLayout(raw.length, geom.innerWData);
  return raw.map((p, i) => ({ ...p, x: centers[i] }));
}

function SadhanaOrdinalChart({
  column,
  series,
  chartNoData,
  chartAria,
}: {
  column: SadhanaHistoryChartColumnKey;
  series: SadhanaHistoryRow[];
  chartNoData: string;
  chartAria: (columnTitle: string) => string;
}) {
  const options = SADHANA_OPTION_ORDER_BY_CHART_COLUMN[column];
  const pts = useMemo(() => buildPointCoords(series, column, options), [series, column, options]);

  const innerWData = useMemo(() => computeInnerWData(pts.length), [pts.length]);
  const geom = useMemo(() => chartPlotGeom(options.length, innerWData), [options.length, innerWData]);
  const chartW = geom.chartW;

  const barWidth = useMemo(() => {
    const n = pts.length;
    if (n === 0) return 0;
    return packedBarLayout(n, geom.innerWData).barWidth;
  }, [pts.length, geom.innerWData]);

  const yLabelIndices = useMemo(
    () => Array.from({ length: options.length }, (_, i) => i),
    [options.length]
  );

  const yLow = geom.yLow;
  const yHigh = PAD.T;

  return (
    <div className="sadhana-chart-card">
      <h4 className="sadhana-chart-card__title">{column}</h4>
      {pts.length === 0 ? (
        <p className="sadhana-chart-card__empty">{chartNoData}</p>
      ) : (
        <svg
          className="sadhana-chart-svg"
          viewBox={`0 0 ${chartW} ${H}`}
          width={chartW}
          style={{ minWidth: '100%' }}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={chartAria(column)}
        >
          {yLabelIndices.map((yi) => {
            const yg = yFromOrdinal(yi, geom);
            return (
              <line
                key={`grid-${yi}`}
                x1={PAD.L}
                y1={yg}
                x2={chartW - PAD.R}
                y2={yg}
                className="sadhana-chart-svg__grid"
              />
            );
          })}
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
            x2={chartW - PAD.R}
            y2={yLow}
            className="sadhana-chart-svg__axis"
          />
          {yLabelIndices.map((yi) => {
            const ySvg = yFromOrdinal(yi, geom);
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
          {pts.map((p, i) => {
            const h = Math.max(0, yLow - p.y);
            const w = barWidth;
            const x = p.x - w / 2;
            return (
              <rect
                key={`bar-${p.date}-${i}`}
                x={x}
                y={p.y}
                width={w}
                height={h}
                rx={2}
                ry={2}
                className="sadhana-chart-svg__bar"
              >
                <title>{`${p.date}: ${p.label}`}</title>
              </rect>
            );
          })}
          {pts.map((p, i) => {
            const label = formatChartAxisDate(p.date);
            return (
              <g key={`xlab-${i}-${p.date}`}>
                <title>{p.date}</title>
                <g transform={`translate(${p.x}, ${yLow + 4}) rotate(90)`}>
                  <text
                    x={0}
                    y={0}
                    className="sadhana-chart-svg__x-label"
                    textAnchor="start"
                    dominantBaseline="hanging"
                  >
                    {label}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export const SadhanaHistoryCharts: React.FC<Props> = ({ series, copy }) => {
  if (series.length === 0) {
    return null;
  }

  const chartsHeading = copy?.chartsHeading ?? t.recordsChartsHeading;
  const chartsHint = copy?.chartsHint ?? t.recordsChartsHint;
  const chartNoData = copy?.chartNoData ?? t.recordsChartNoData;
  const chartAria = copy?.chartAria ?? t.recordsChartAria;

  return (
    <section className="sadhana-records-charts" aria-label={chartsHeading}>
      <h3 className="sadhana-records-subtitle">{chartsHeading}</h3>
      <p className="sadhana-records-charts-hint">{chartsHint}</p>
      <div className="sadhana-records-charts-grid">
        {SADHANA_HISTORY_CHART_COLUMNS.map((col) => (
          <SadhanaOrdinalChart
            key={col}
            column={col}
            series={series}
            chartNoData={chartNoData}
            chartAria={chartAria}
          />
        ))}
      </div>
    </section>
  );
};
