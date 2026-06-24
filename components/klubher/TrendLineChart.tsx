'use client';

// Pure-SVG trend line — used by Temperature & Water panels. Renders the
// last N points of a series (left = oldest, right = newest), plus an
// optional pair of horizontal threshold lines (warn / critical) so the
// reader can see at a glance whether the series crosses an alert tier.
//
// No external charting lib by design — the IRYS codebase prefers
// hand-rolled SVG (AlertsView's bar chart, RingGauge, DonutBreakdown
// all follow the same convention).

import { useMemo } from 'react';

export interface TrendPoint {
  hoursAgo: number;
  value: number;
}

export interface TrendBand {
  warn?: number;
  critical?: number;
  // When set, values *outside* [min, max] are warn/critical. Otherwise
  // values *above* the threshold are warn/critical (the default).
  doubleSided?: { warnMin?: number; warnMax?: number; criticalMin?: number; criticalMax?: number };
}

export default function TrendLineChart({
  series,
  unit,
  band,
  height = 180,
  ariaLabel,
}: {
  series: TrendPoint[];
  unit: string;          // " °C", " mm" etc — appended to axis labels
  band?: TrendBand;
  height?: number;
  ariaLabel: string;
}) {
  // Render oldest → newest, so newest is on the right (matches the bar
  // chart on /alerts).
  const points = useMemo(() => [...series].sort((a, b) => b.hoursAgo - a.hoursAgo), [series]);

  const { min, max, ticks } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const p of points) { if (p.value < lo) lo = p.value; if (p.value > hi) hi = p.value; }
    if (band?.warn != null)          { lo = Math.min(lo, band.warn);          hi = Math.max(hi, band.warn);     }
    if (band?.critical != null)      { lo = Math.min(lo, band.critical);      hi = Math.max(hi, band.critical); }
    if (band?.doubleSided?.warnMin != null)     { lo = Math.min(lo, band.doubleSided.warnMin); }
    if (band?.doubleSided?.warnMax != null)     { hi = Math.max(hi, band.doubleSided.warnMax); }
    if (band?.doubleSided?.criticalMin != null) { lo = Math.min(lo, band.doubleSided.criticalMin); }
    if (band?.doubleSided?.criticalMax != null) { hi = Math.max(hi, band.doubleSided.criticalMax); }
    // Pad the range a little so the line never glues to the chart edge.
    const range = Math.max(0.5, hi - lo);
    lo -= range * 0.1;
    hi += range * 0.1;
    const mid = (lo + hi) / 2;
    return { min: lo, max: hi, ticks: [hi, mid, lo] };
  }, [points, band]);

  // viewBox in svg-units so the path stays sharp at any rendered width.
  const VW = 600;
  const VH = height;
  const PAD_L = 36;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const innerW = VW - PAD_L - PAD_R;
  const innerH = VH - PAD_T - PAD_B;

  const xAt = (i: number) =>
    PAD_L + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(p.value).toFixed(2)}`)
    .join(' ');

  // Area under the line — softens the chart visually like a sparkline.
  const area = points.length > 1
    ? `${path} L ${xAt(points.length - 1).toFixed(2)} ${PAD_T + innerH} L ${xAt(0).toFixed(2)} ${PAD_T + innerH} Z`
    : '';

  const newest = points[points.length - 1];

  return (
    <div className="trend-chart-wrap">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="trend-chart"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        {/* gridlines */}
        {ticks.map((t, i) => (
          <line
            key={`g${i}`}
            x1={PAD_L} x2={VW - PAD_R}
            y1={yAt(t)} y2={yAt(t)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* threshold lines */}
        {band?.warn != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.warn)} y2={yAt(band.warn)}
            stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 4" opacity="0.75" />
        )}
        {band?.critical != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.critical)} y2={yAt(band.critical)}
            stroke="var(--bad)" strokeWidth={1} strokeDasharray="4 4" opacity="0.85" />
        )}
        {band?.doubleSided?.warnMin != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.doubleSided.warnMin)} y2={yAt(band.doubleSided.warnMin)}
            stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 4" opacity="0.75" />
        )}
        {band?.doubleSided?.warnMax != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.doubleSided.warnMax)} y2={yAt(band.doubleSided.warnMax)}
            stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 4" opacity="0.75" />
        )}
        {band?.doubleSided?.criticalMin != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.doubleSided.criticalMin)} y2={yAt(band.doubleSided.criticalMin)}
            stroke="var(--bad)" strokeWidth={1} strokeDasharray="4 4" opacity="0.85" />
        )}
        {band?.doubleSided?.criticalMax != null && (
          <line x1={PAD_L} x2={VW - PAD_R} y1={yAt(band.doubleSided.criticalMax)} y2={yAt(band.doubleSided.criticalMax)}
            stroke="var(--bad)" strokeWidth={1} strokeDasharray="4 4" opacity="0.85" />
        )}

        {/* area + line */}
        {area && <path d={area} fill="url(#trend-grad)" />}
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="var(--accent-blue)" strokeWidth={1.6} />

        {/* most-recent point dot */}
        {newest && (
          <circle
            cx={xAt(points.length - 1)}
            cy={yAt(newest.value)}
            r={3.4}
            fill="var(--accent-blue)"
          />
        )}

        {/* y axis ticks (right of left pad) */}
        {ticks.map((t, i) => (
          <text
            key={`t${i}`}
            x={PAD_L - 6}
            y={yAt(t) + 3}
            textAnchor="end"
            fontSize="10"
            fill="rgba(255,255,255,0.6)"
          >
            {t.toFixed(1)}{unit}
          </text>
        ))}

        {/* x axis edge labels */}
        <text x={PAD_L} y={VH - 6} fontSize="10" fill="rgba(255,255,255,0.6)">
          {points.length}h ago
        </text>
        <text x={VW - PAD_R} y={VH - 6} fontSize="10" fill="rgba(255,255,255,0.6)" textAnchor="end">
          now
        </text>
      </svg>
    </div>
  );
}
