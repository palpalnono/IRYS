'use client';

// Fuel Inventory — modelled on the SmartFill "Tanks" page. A bar chart
// up top (one bar per tank, capacity grey, SFL hatched, current volume
// in fuel-type colour) and a sortable data table below with the same
// columns the SmartFill export exposes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KlubherNav from './KlubherNav';
import { Card } from '@/components/atoms';
import { LOW_STOCK_PCT, type Tank } from '@/lib/klubher-types';

type SortKey =
  | 'description' | 'capacity' | 'sfl' | 'fuelType' | 'unitName'
  | 'unitNumber' | 'tankNumber' | 'lastDip' | 'volume' | 'volumePct'
  | 'status' | 'dipMethod';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function FuelInventoryView({ tanks }: { tanks: Tank[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'description', dir: 'asc' });
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tanks.filter((t) =>
          `${t.description} ${t.fuelType} ${t.unitNumber} ${t.tankNumber} ${t.status}`.toLowerCase().includes(q),
        )
      : tanks;
    return [...filtered].sort((a, b) => {
      const k = sort.key;
      let av: string | number;
      let bv: string | number;
      if (k === 'volumePct') { av = a.volume / a.capacity; bv = b.volume / b.capacity; }
      else if (k === 'lastDip') { av = a.minsAgo; bv = b.minsAgo; }   // recency sort
      else {
        const av0 = (a as unknown as Record<string, unknown>)[k];
        const bv0 = (b as unknown as Record<string, unknown>)[k];
        av = typeof av0 === 'number' ? av0 : String(av0 ?? '');
        bv = typeof bv0 === 'number' ? bv0 : String(bv0 ?? '');
      }
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [tanks, query, sort]);

  // Infinite scroll for the table — same vocabulary as FmsDataView.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [query, sort]);
  const cap = useRef(rows.length);
  cap.current = rows.length;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLTableRowElement | null) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, cap.current));
        }
      },
      { root: node.closest('.table-wrap'), rootMargin: '120px' },
    );
    observerRef.current.observe(node);
  }, []);

  const summary = useMemo(() => {
    let totalCap = 0, totalVol = 0, low = 0, online = 0;
    for (const t of tanks) {
      totalCap += t.capacity;
      totalVol += t.volume;
      if (t.volume / t.capacity < LOW_STOCK_PCT) low++;
      if (t.online) online++;
    }
    return { totalCap, totalVol, low, online };
  }, [tanks]);

  const setSortKey = (k: SortKey) => {
    if (sort.key === k) setSort({ key: k, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else setSort({ key: k, dir: 'asc' });
  };

  const arrow = (k: SortKey) =>
    sort.key !== k ? '↕' : sort.dir === 'asc' ? '▲' : '▼';

  return (
    <main className="overview klubher-section klubher-inventory">
      <div className="fuel-head">
        <div className="fuel-title-row">
          <span className="sys-icon-inline">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="6" width="16" height="14" rx="2" /><path d="M4 13h16M8 6V4h8v2" />
            </svg>
          </span>
          <div>
            <div className="screen-title">Fuel Inventory</div>
            <div className="screen-sub">
              {tanks.length} tanks · {summary.totalVol.toLocaleString()} L of {summary.totalCap.toLocaleString()} L
              {' · '}{summary.online} online
              {summary.low > 0 && <> · <span className="klubher-low-flag">{summary.low} low</span></>}
            </div>
          </div>
        </div>
      </div>

      <KlubherNav active="inventory" />

      {/* ---- Bar chart -------------------------------------------------- */}
      <Card title="TANKS" subtitle="Fill level per tank">
        <TankBarChart tanks={tanks} hovered={hovered} setHovered={setHovered} />
        <div className="klubher-bar-legend">
          <span className="klubher-bar-legend-item">
            <span className="klubher-bar-legend-swatch online" /> Online
          </span>
          <span className="klubher-bar-legend-item">
            <span className="klubher-bar-legend-swatch fresh" /> Dip &lt; 24hrs old
          </span>
          <span className="klubher-bar-legend-item">
            <span className="klubher-bar-legend-swatch sfl" /> Safe fill limit
          </span>
        </div>
      </Card>

      {/* ---- Data table ------------------------------------------------- */}
      <Card
        title="TANK DETAIL"
        subtitle={`${rows.length} of ${tanks.length} tanks${query ? ` · matching "${query}"` : ''}`}
        actions={
          <label className="search klubher-tx-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Type to search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter tanks by description, fuel type, unit, or status"
            />
          </label>
        }
      >
        <div className="table-wrap klubher-table-wrap">
          <table className="unit-table klubher-inventory-table">
            <thead>
              <tr>
                <th onClick={() => setSortKey('description')} className={`sortable ${sort.key === 'description' ? 'active' : ''}`}>
                  <div className="th-inner">Description <span className="sort-ico">{arrow('description')}</span></div>
                </th>
                <th>Unit</th>
                <th onClick={() => setSortKey('capacity')}   className={`sortable ${sort.key === 'capacity'   ? 'active' : ''}`}>
                  <div className="th-inner">Capacity <span className="sort-ico">{arrow('capacity')}</span></div>
                </th>
                <th onClick={() => setSortKey('sfl')}        className={`sortable ${sort.key === 'sfl'        ? 'active' : ''}`}>
                  <div className="th-inner">Safe Fill <span className="sort-ico">{arrow('sfl')}</span></div>
                </th>
                <th onClick={() => setSortKey('fuelType')}   className={`sortable ${sort.key === 'fuelType'   ? 'active' : ''}`}>
                  <div className="th-inner">Fuel <span className="sort-ico">{arrow('fuelType')}</span></div>
                </th>
                <th onClick={() => setSortKey('unitName')}   className={`sortable ${sort.key === 'unitName'   ? 'active' : ''}`}>
                  <div className="th-inner">Station <span className="sort-ico">{arrow('unitName')}</span></div>
                </th>
                <th onClick={() => setSortKey('unitNumber')} className={`sortable ${sort.key === 'unitNumber' ? 'active' : ''}`}>
                  <div className="th-inner">Unit No. <span className="sort-ico">{arrow('unitNumber')}</span></div>
                </th>
                <th onClick={() => setSortKey('tankNumber')} className={`sortable ${sort.key === 'tankNumber' ? 'active' : ''}`}>
                  <div className="th-inner">Tank No. <span className="sort-ico">{arrow('tankNumber')}</span></div>
                </th>
                <th onClick={() => setSortKey('lastDip')}    className={`sortable ${sort.key === 'lastDip'    ? 'active' : ''}`}>
                  <div className="th-inner">Last Check <span className="sort-ico">{arrow('lastDip')}</span></div>
                </th>
                <th onClick={() => setSortKey('volume')}     className={`sortable ${sort.key === 'volume'     ? 'active' : ''}`}>
                  <div className="th-inner">Volume <span className="sort-ico">{arrow('volume')}</span></div>
                </th>
                <th onClick={() => setSortKey('volumePct')}  className={`sortable ${sort.key === 'volumePct'  ? 'active' : ''}`}>
                  <div className="th-inner">Volume % <span className="sort-ico">{arrow('volumePct')}</span></div>
                </th>
                <th onClick={() => setSortKey('status')}     className={`sortable ${sort.key === 'status'     ? 'active' : ''}`}>
                  <div className="th-inner">Status <span className="sort-ico">{arrow('status')}</span></div>
                </th>
                <th onClick={() => setSortKey('dipMethod')}  className={`sortable ${sort.key === 'dipMethod'  ? 'active' : ''}`}>
                  <div className="th-inner">Dip Method <span className="sort-ico">{arrow('dipMethod')}</span></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={13} className="empty-row">No tanks match the filter.</td></tr>
              )}
              {rows.slice(0, visibleCount).map((t) => {
                const pct = Math.round((t.volume / t.capacity) * 100);
                return (
                  <tr
                    key={t.id}
                    className={`unit-row ${hovered === t.id ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHovered(t.id)}
                    onMouseLeave={() => setHovered((h) => (h === t.id ? null : h))}
                  >
                    <td>{t.description}</td>
                    <td className="muted">{t.volumetricUnit}</td>
                    <td className="tabular-nums">{t.capacity.toLocaleString()}</td>
                    <td className="tabular-nums">{t.sfl.toLocaleString()}</td>
                    <td>
                      <span className={`klubher-fuel-chip klubher-fuel-${t.fuelType.toLowerCase()}`}>{t.fuelType}</span>
                    </td>
                    <td>{t.unitName}</td>
                    <td className="muted tabular-nums">{t.unitNumber}</td>
                    <td className="muted tabular-nums">{t.tankNumber}</td>
                    <td className="muted tabular-nums">{t.lastDip}</td>
                    <td className="tabular-nums">{t.volume.toLocaleString()}</td>
                    <td className="tabular-nums">{pct}</td>
                    <td>
                      <span className={`klubher-chip klubher-chip-${t.status === 'Online' ? 'ok' : 'bad'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="muted">{t.dipMethod}</td>
                  </tr>
                );
              })}
              {visibleCount < rows.length && (
                <tr ref={sentinelRef} className="tl-sentinel">
                  <td colSpan={13}>Loading more…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}

// ----- Bar chart -----------------------------------------------------------

function TankBarChart({
  tanks,
  hovered,
  setHovered,
}: {
  tanks: Tank[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  const VH = 320;
  const PAD_T = 24;
  const PAD_B = 84;
  const PAD_L = 56;
  const PAD_R = 24;
  const innerH = VH - PAD_T - PAD_B;

  // Bars share a 100% vertical scale (0 to capacity per bar). To compare
  // across tanks the eye uses the % marks on the y-axis, not raw litres,
  // matching the SmartFill page convention.
  const N = Math.max(1, tanks.length);
  const VW = PAD_L + PAD_R + N * 110;
  const barWidth = 70;
  const slot = (VW - PAD_L - PAD_R) / N;

  // Hatch pattern lives in the defs so every overfill rectangle reuses
  // the same fill — saves bytes and keeps the stripe spacing consistent.
  return (
    <div className="klubher-bar-chart-wrap">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="klubher-bar-chart" role="img" aria-label="Tank fill percentages">
        <defs>
          <pattern id="klubher-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(255,255,255,0.04)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* y-axis ticks every 20% */}
        {[0, 20, 40, 60, 80, 100].map((p) => {
          const y = PAD_T + innerH - (p / 100) * innerH;
          return (
            <g key={p}>
              <line x1={PAD_L} x2={VW - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={PAD_L - 8} y={y + 4} fontSize="11" fill="rgba(255,255,255,0.6)" textAnchor="end">{p} %</text>
            </g>
          );
        })}

        {tanks.map((t, i) => {
          const cx = PAD_L + slot * (i + 0.5);
          const x = cx - barWidth / 2;
          const sflPct = t.sfl / t.capacity;
          const volPct = t.volume / t.capacity;
          const volH = volPct * innerH;
          const sflY = PAD_T + innerH - sflPct * innerH;
          const volY = PAD_T + innerH - volH;
          const fillColor = t.fuelType === 'Diesel' ? '#F29B25' : '#A855F7'; // SmartFill-like orange for Diesel, purple for Petrol
          const isHovered = hovered === t.id;
          return (
            <g
              key={t.id}
              className="klubher-bar-group"
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              tabIndex={0}
              role="figure"
              aria-label={`${t.description}, ${Math.round(volPct * 100)} percent fill, ${t.volume.toLocaleString()} of ${t.capacity.toLocaleString()} litres`}
            >
              {/* Capacity envelope (0 → capacity) */}
              <rect x={x} y={PAD_T} width={barWidth} height={innerH} fill="rgba(255,255,255,0.04)" />

              {/* Hatched overfill band (SFL → capacity) */}
              <rect x={x} y={PAD_T} width={barWidth} height={sflY - PAD_T} fill="url(#klubher-hatch)" />

              {/* Filled volume (0 → current) */}
              <rect x={x} y={volY} width={barWidth} height={volH} fill={fillColor} opacity={isHovered ? 1 : 0.92} />

              {/* Safe-fill marker line */}
              <line x1={x - 4} x2={x + barWidth + 4} y1={sflY} y2={sflY} stroke="rgba(255,255,255,0.45)" strokeDasharray="3 3" strokeWidth="1" />
              <text x={x + barWidth + 6} y={sflY - 4} fontSize="10" fill="rgba(255,255,255,0.7)">
                Safe {t.sfl.toLocaleString()} L
              </text>

              {/* Percentage label centered in the fill */}
              <text
                x={cx}
                y={volY + Math.min(20, volH / 2 + 4)}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#fff"
              >
                {Math.round(volPct * 100)}%
              </text>
              <text
                x={cx}
                y={volY + Math.min(36, volH / 2 + 20)}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.85)"
              >
                ({t.volume.toLocaleString()} L)
              </text>

              {/* Tank label, angled */}
              <text
                x={cx}
                y={PAD_T + innerH + 16}
                fontSize="11"
                fill="rgba(255,255,255,0.85)"
                textAnchor="end"
                transform={`rotate(-30 ${cx} ${PAD_T + innerH + 16})`}
              >
                {t.description} ({t.fuelType})
              </text>
            </g>
          );
        })}

        {/* y-axis line + label */}
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + innerH} stroke="rgba(255,255,255,0.15)" />
        <line x1={PAD_L} x2={VW - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="rgba(255,255,255,0.15)" />
        <text x={VW - PAD_R} y={PAD_T + innerH + 64} fontSize="11" fill="rgba(255,255,255,0.6)" textAnchor="end">
          Tanks
        </text>
      </svg>

      {/* Hover tooltip — anchored to the right of the chart so it doesn't
          overlap the bar the user is looking at. Mirrors the SmartFill
          tooltip layout. */}
      {hovered && (() => {
        const t = tanks.find((x) => x.id === hovered);
        if (!t) return null;
        const pct = Math.round((t.volume / t.capacity) * 100);
        return (
          <div className="klubher-bar-tip" role="tooltip">
            <div className="klubher-bar-tip-head">
              <span className={`klubher-bar-tip-dot ${t.fuelType.toLowerCase()}`} />
              <strong>{t.description}</strong> <span className="muted">({t.fuelType})</span>
            </div>
            <div className="klubher-bar-tip-row klubher-bar-tip-num">
              {t.volume.toLocaleString()}/{t.capacity.toLocaleString()} L <span className="klubher-bar-tip-pct">{pct}%</span>
            </div>
            <dl className="klubher-bar-tip-kv">
              <div><dt>Unit</dt><dd>{t.unitName} (#{t.unitNumber})</dd></div>
              <div><dt>Safe fill</dt><dd>{t.sfl.toLocaleString()} L</dd></div>
              <div><dt>Last check</dt><dd>{t.lastDip}</dd></div>
            </dl>
          </div>
        );
      })()}
    </div>
  );
}
