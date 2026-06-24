'use client';

// FMS — Transactions / Transfers / Delivery. Three sortable tables
// behind a sub-tab strip, with date-range + tank-id filters and a CSV
// export per active table. Reuses .unit-table markup + the visibleCount
// infinite-scroll pattern from system and alerts tables so the styling and
// keyboard behaviour stay consistent across the dashboard.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KlubherNav from './KlubherNav';
import { Card } from '@/components/atoms';
import type {
  Tank,
  FmsTransaction,
  FmsTransfer,
  FmsDelivery,
} from '@/lib/klubher-types';

type SubTab = 'transactions' | 'transfers' | 'delivery';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function FmsDataView({
  tanks,
  transactions,
  transfers,
  deliveries,
}: {
  tanks: Tank[];
  transactions: FmsTransaction[];
  transfers: FmsTransfer[];
  deliveries: FmsDelivery[];
}) {
  const [sub, setSub] = useState<SubTab>('transactions');

  // Shared date-window: filters all three tables to "last N hours".
  const [windowHours, setWindowHours] = useState<24 | 72 | 168>(168);
  const windowMins = windowHours * 60;

  // Tank filter — Delivery only (Transactions don't carry a tank link,
  // Transfers carry free-form "SmartFill 1001 Tank 1"-style strings that
  // don't match our synthetic TANKS list).
  const [tankFilter, setTankFilter] = useState<string>('all');

  // Per-tab text search. Free-form substring; matches anything visible.
  const [txQuery, setTxQuery] = useState('');
  const [tfQuery, setTfQuery] = useState('');

  // Sort state per sub-tab. Stored separately so switching tabs doesn't
  // reset the user's column choice on the others.
  const [txSort, setTxSort] = useState<{ key: keyof FmsTransaction | 'time'; dir: SortDir }>({ key: 'time', dir: 'asc' });
  const [tfSort, setTfSort] = useState<{ key: keyof FmsTransfer    | 'time'; dir: SortDir }>({ key: 'time', dir: 'asc' });
  const [dlSort, setDlSort] = useState<{ key: keyof FmsDelivery    | 'time'; dir: SortDir }>({ key: 'time', dir: 'asc' });

  // ------------ filtered + sorted rows per tab ----------------------

  // Pull a field by key, treating 'time' as a synthetic alias for minsAgo
  // so the time column sorts by recency rather than by display string.
  function fieldOf<T extends { minsAgo: number }>(r: T, k: string): string | number {
    if (k === 'time') return r.minsAgo;
    const v = (r as unknown as Record<string, unknown>)[k];
    return typeof v === 'number' ? v : String(v ?? '');
  }
  function cmp(av: string | number, bv: string | number): number {
    return typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
  }

  const txRows = useMemo(() => {
    const q = txQuery.trim().toLowerCase();
    const filtered = transactions.filter((r) => {
      if (r.minsAgo > windowMins) return false;
      if (q && !`${r.registration} ${r.make} ${r.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const c = cmp(fieldOf(a, txSort.key), fieldOf(b, txSort.key));
      return txSort.dir === 'asc' ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, txSort, windowMins, txQuery]);

  const tfRows = useMemo(() => {
    const q = tfQuery.trim().toLowerCase();
    const filtered = transfers.filter((r) => {
      if (r.minsAgo > windowMins) return false;
      if (q && !`${r.driverName} ${r.driverCode} ${r.fromTank} ${r.toTank} ${r.unitName} ${r.pumpName} ${r.reference}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const c = cmp(fieldOf(a, tfSort.key), fieldOf(b, tfSort.key));
      return tfSort.dir === 'asc' ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers, tfSort, windowMins, tfQuery]);

  const dlRows = useMemo(() => {
    const filtered = deliveries.filter((r) => r.minsAgo <= windowMins
      && (tankFilter === 'all' || r.tankId === tankFilter));
    return [...filtered].sort((a, b) => {
      const c = cmp(fieldOf(a, dlSort.key), fieldOf(b, dlSort.key));
      return dlSort.dir === 'asc' ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries, dlSort, windowMins, tankFilter]);

  // ------------ infinite scroll (shared sentinel) -------------------

  const activeRowCount =
    sub === 'transactions' ? txRows.length :
    sub === 'transfers'    ? tfRows.length : dlRows.length;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [sub, windowHours, tankFilter, txQuery, tfQuery, txSort, tfSort, dlSort]);

  const visibleCountCap = useRef(activeRowCount);
  visibleCountCap.current = activeRowCount;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLTableRowElement | null) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, visibleCountCap.current));
        }
      },
      { root: node.closest('.table-wrap'), rootMargin: '120px' },
    );
    observerRef.current.observe(node);
  }, []);

  // ------------ CSV export ------------------------------------------

  const exportCsv = useCallback(() => {
    // Cells are wrapped in double quotes (matches the source CSV's style)
    // and embedded quotes are doubled per RFC 4180.
    const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    let headers: string[];
    let rows: string[];
    let filename: string;

    if (sub === 'transactions') {
      // Column order/labels mirror Transactions_11May26_to_17May26.csv
      // exactly so the file is drop-in compatible with whatever tooling
      // already consumes that export.
      headers = ['Date', 'Time', 'Description', 'Registration', 'Make', 'Litres', 'Unit Price', 'Total Price'];
      rows = txRows.map((r) =>
        [r.date, r.time, r.description, r.registration, r.make, r.litres.toFixed(2), r.unitPrice.toFixed(2), r.totalPrice.toFixed(2)]
          .map(quote)
          .join(','),
      );
      filename = `klubher-transactions-${windowHours}h.csv`;
    } else if (sub === 'transfers') {
      // Column order matches Transfers_Report_1May26_to_31May26.csv
      // verbatim — re-importing the export into the same tooling that
      // produced it should be a no-op.
      headers = [
        'Date', 'Time', 'Unit Name', 'Pump', 'Flowmeter', 'Pump Name',
        'From Tank', 'To Tank', 'Volume', 'Units', 'Reference',
        'Driver Name', 'Driver Key / Code',
      ];
      rows = tfRows.map((r) =>
        [
          r.date, r.time, r.unitName, r.pump, r.flowmeter, r.pumpName,
          r.fromTank, r.toTank, r.volume.toFixed(2), r.units, r.reference,
          r.driverName, r.driverCode,
        ].map(quote).join(','),
      );
      filename = `klubher-transfers-${windowHours}h.csv`;
    } else {
      headers = ['Time', 'Delivery ID', 'Supplier', 'Tank', 'Volume (L)', 'Batch', 'Status'];
      rows = dlRows.map((r) =>
        [r.timestamp, r.id, r.supplier, r.tankId, r.volumeL, r.batchRef, r.status].map(quote).join(','),
      );
      filename = `klubher-deliveries-${windowHours}h.csv`;
    }

    if (rows.length === 0) return;
    const csv = `${headers.map(quote).join(',')}\n${rows.join('\n')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [sub, txRows, tfRows, dlRows, windowHours]);

  // ------------ header arrows + helpers -----------------------------

  const arrow = (active: boolean, dir: SortDir) =>
    !active ? '↕' : dir === 'asc' ? '▲' : '▼';

  // ------------ render ----------------------------------------------

  return (
    <main className="overview klubher-section klubher-fms">
      <div className="fuel-head">
        <div className="fuel-title-row">
          <span className="sys-icon-inline">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" />
            </svg>
          </span>
          <div>
            <div className="screen-title">FMS</div>
            <div className="screen-sub">Transactions · Transfers · Delivery, last {windowHours === 168 ? '7 days' : `${windowHours}h`}</div>
          </div>
        </div>
      </div>

      <KlubherNav active="fms" />

      <Card
        title="FUEL MOVEMENT"
        subtitle={
          sub === 'transactions'
            ? `${activeRowCount} row${activeRowCount === 1 ? '' : 's'}${txQuery ? ` · matching "${txQuery}"` : ''}`
            : sub === 'transfers'
            ? `${activeRowCount} row${activeRowCount === 1 ? '' : 's'}${tfQuery ? ` · matching "${tfQuery}"` : ''}`
            : `${activeRowCount} row${activeRowCount === 1 ? '' : 's'} · ${tankFilter === 'all' ? 'all tanks' : tankFilter}`
        }
        actions={
          <div className="klubher-actions">
            <div className="alerts-tabs">
              {(['transactions', 'transfers', 'delivery'] as SubTab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`tab ${sub === k ? 'active' : ''}`}
                  onClick={() => setSub(k)}
                >
                  {k === 'transactions' ? 'Transactions' : k === 'transfers' ? 'Transfers' : 'Delivery'}
                </button>
              ))}
            </div>
            <div className="alerts-tabs" aria-label="Date range">
              {([24, 72, 168] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`tab ${windowHours === h ? 'active' : ''}`}
                  onClick={() => setWindowHours(h)}
                >
                  {h === 168 ? '7d' : `${h}h`}
                </button>
              ))}
            </div>
            {sub === 'transactions' && (
              <label className="search klubher-tx-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  placeholder="Plate, make, auth method…"
                  value={txQuery}
                  onChange={(e) => setTxQuery(e.target.value)}
                  aria-label="Filter transactions by registration, make, or description"
                />
              </label>
            )}
            {sub === 'transfers' && (
              <label className="search klubher-tx-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  placeholder="Driver, tank, pump, ref…"
                  value={tfQuery}
                  onChange={(e) => setTfQuery(e.target.value)}
                  aria-label="Filter transfers by driver, tank, pump, or reference"
                />
              </label>
            )}
            {sub === 'delivery' && (
              <label className="klubher-select-wrap">
                <span className="klubher-select-label">Tank</span>
                <select
                  className="klubher-select"
                  value={tankFilter}
                  onChange={(e) => setTankFilter(e.target.value)}
                >
                  <option value="all">All tanks</option>
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>{t.description}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="btn-sm primary"
              onClick={exportCsv}
              disabled={activeRowCount === 0}
              aria-label="Export current table as CSV"
            >
              ⤓ Export CSV
            </button>
          </div>
        }
      >
        <div className="table-wrap klubher-table-wrap">
          {sub === 'transactions' && (
            <table className="unit-table">
              <thead>
                <tr>
                  {/* Columns mirror the source CSV one-for-one so the
                      on-screen table and a re-exported file look the same. */}
                  <Th k="date"         cur={txSort} set={setTxSort}>Date</Th>
                  <Th k="time"         cur={txSort} set={setTxSort}>Time</Th>
                  <Th k="description"  cur={txSort} set={setTxSort}>Description</Th>
                  <Th k="registration" cur={txSort} set={setTxSort}>Plate</Th>
                  <Th k="make"         cur={txSort} set={setTxSort}>Make</Th>
                  <Th k="litres"       cur={txSort} set={setTxSort}>Litres</Th>
                  <Th k="unitPrice"    cur={txSort} set={setTxSort}>Price / L</Th>
                  <Th k="totalPrice"   cur={txSort} set={setTxSort}>Total</Th>
                </tr>
              </thead>
              <tbody>
                {txRows.length === 0 && (
                  <tr><td colSpan={8} className="empty-row">No transactions in this window.</td></tr>
                )}
                {txRows.slice(0, visibleCount).map((r) => (
                  <tr key={r.id} className="unit-row">
                    <td className="muted tabular-nums">{r.date}</td>
                    <td className="muted tabular-nums">{r.time}</td>
                    <td>{r.description || <span className="klubher-blank">—</span>}</td>
                    <td className="tabular-nums">{r.registration || <span className="klubher-blank">—</span>}</td>
                    <td>{r.make || <span className="klubher-blank">—</span>}</td>
                    <td className="tabular-nums">{r.litres.toFixed(2)}</td>
                    <td className="muted tabular-nums">{r.unitPrice.toFixed(2)}</td>
                    <td className="tabular-nums">{r.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
                {visibleCount < txRows.length && (
                  <tr ref={sentinelRef} className="tl-sentinel">
                    <td colSpan={8}>Loading more…</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {sub === 'transfers' && (
            <table className="unit-table">
              <thead>
                <tr>
                  {/* Columns mirror Transfers_Report_1May26_to_31May26.csv
                      one-for-one; "Units" really does hold the fuel type
                      (Diesel/Petrol), not a unit of measure. */}
                  <Th k="date"        cur={tfSort} set={setTfSort}>Date</Th>
                  <Th k="time"        cur={tfSort} set={setTfSort}>Time</Th>
                  <Th k="unitName"    cur={tfSort} set={setTfSort}>Unit</Th>
                  <Th k="pump"        cur={tfSort} set={setTfSort}>Pump</Th>
                  <Th k="flowmeter"   cur={tfSort} set={setTfSort}>Meter</Th>
                  <Th k="pumpName"    cur={tfSort} set={setTfSort}>Pump Area</Th>
                  <Th k="fromTank"    cur={tfSort} set={setTfSort}>From Tank</Th>
                  <Th k="toTank"      cur={tfSort} set={setTfSort}>To Tank</Th>
                  <Th k="volume"      cur={tfSort} set={setTfSort}>Volume</Th>
                  <Th k="units"       cur={tfSort} set={setTfSort}>Fuel</Th>
                  <Th k="reference"   cur={tfSort} set={setTfSort}>Ref</Th>
                  <Th k="driverName"  cur={tfSort} set={setTfSort}>Driver</Th>
                  <Th k="driverCode"  cur={tfSort} set={setTfSort}>Code</Th>
                </tr>
              </thead>
              <tbody>
                {tfRows.length === 0 && (
                  <tr><td colSpan={13} className="empty-row">No transfers in this window.</td></tr>
                )}
                {tfRows.slice(0, visibleCount).map((r) => (
                  <tr key={r.id} className="unit-row">
                    <td className="muted tabular-nums">{r.date}</td>
                    <td className="muted tabular-nums">{r.time}</td>
                    <td>{r.unitName}</td>
                    <td className="muted tabular-nums">{r.pump}</td>
                    <td className="muted tabular-nums">{r.flowmeter}</td>
                    <td className="muted">{r.pumpName}</td>
                    <td>{r.fromTank}</td>
                    <td>{r.toTank || <span className="klubher-blank">—</span>}</td>
                    <td className="tabular-nums">{r.volume.toFixed(2)}</td>
                    <td>
                      <span className={`klubher-fuel-chip klubher-fuel-${r.units.toLowerCase()}`}>
                        {r.units}
                      </span>
                    </td>
                    <td className="muted tabular-nums">{r.reference}</td>
                    <td>{r.driverName}</td>
                    <td className="muted tabular-nums">{r.driverCode}</td>
                  </tr>
                ))}
                {visibleCount < tfRows.length && (
                  <tr ref={sentinelRef} className="tl-sentinel">
                    <td colSpan={13}>Loading more…</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {sub === 'delivery' && (
            <table className="unit-table">
              <thead>
                <tr>
                  <Th k="time"     cur={dlSort} set={setDlSort}>Time</Th>
                  <Th k="id"       cur={dlSort} set={setDlSort}>Delivery</Th>
                  <Th k="supplier" cur={dlSort} set={setDlSort}>Supplier</Th>
                  <Th k="tankId"   cur={dlSort} set={setDlSort}>Tank</Th>
                  <Th k="volumeL"  cur={dlSort} set={setDlSort}>Volume (L)</Th>
                  <Th k="batchRef" cur={dlSort} set={setDlSort}>Batch</Th>
                  <Th k="status"   cur={dlSort} set={setDlSort}>Status</Th>
                </tr>
              </thead>
              <tbody>
                {dlRows.length === 0 && (
                  <tr><td colSpan={7} className="empty-row">No deliveries in this window.</td></tr>
                )}
                {dlRows.slice(0, visibleCount).map((r) => (
                  <tr key={r.id} className="unit-row">
                    <td className="muted">{r.timestamp}</td>
                    <td>{r.id}</td>
                    <td>{r.supplier}</td>
                    <td>{r.tankId}</td>
                    <td className="tabular-nums">{r.volumeL.toLocaleString()}</td>
                    <td className="muted">{r.batchRef}</td>
                    <td><DlStatus s={r.status} /></td>
                  </tr>
                ))}
                {visibleCount < dlRows.length && (
                  <tr ref={sentinelRef} className="tl-sentinel">
                    <td colSpan={7}>Loading more…</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </main>
  );

  // ---- inline subcomponent: sortable header cell -------------------
  function Th<S extends { key: string; dir: SortDir }>({
    k, cur, set, children,
  }: {
    k: S['key'];
    cur: S;
    set: (s: S) => void;
    children: React.ReactNode;
  }) {
    const active = cur.key === k;
    const onClick = () => {
      if (active) set({ ...cur, dir: cur.dir === 'asc' ? 'desc' : 'asc' });
      else set({ ...cur, key: k, dir: 'asc' });
    };
    return (
      <th onClick={onClick} className={`sortable ${active ? 'active' : ''}`}>
        <div className="th-inner">{children} <span className="sort-ico">{arrow(active, cur.dir)}</span></div>
      </th>
    );
  }
}

function DlStatus({ s }: { s: FmsDelivery['status'] }) {
  const cls = s === 'Received' ? 'ok' : s === 'Pending QC' ? 'warn' : 'bad';
  return <span className={`klubher-chip klubher-chip-${cls}`}>{s}</span>;
}
