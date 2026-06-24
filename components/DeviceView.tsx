"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Unit } from "@/lib/data";
import { Card, ConnPill, SysIcon } from "./atoms";
import SystemNav from "./SystemNav";
import BackButton from "./BackButton";

type SortKey = "id" | "minsAgo" | "online";



export default function DeviceView({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("minsAgo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showOnlyOffline, setShowOnlyOffline] = useState(false);

  const summary = useMemo(() => {
    const total = units.length;
    let online = 0;
    for (const u of units) {
      if (u.online) online++;
    }
    const offline = total - online;
    return { total, online, offline };
  }, [units]);

  const rows = useMemo(() => {
    const filtered = showOnlyOffline ? units.filter((u) => !u.online) : units;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "minsAgo") cmp = a.minsAgo - b.minsAgo;
      else if (sortKey === "online") cmp = (a.online ? 1 : 0) - (b.online ? 1 : 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [units, sortKey, sortDir, showOnlyOffline]);

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "id" ? "asc" : "desc"); }
  };
  const sortIco = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕");
  const goTo = (href: Route) => router.push(href);
  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, href: Route) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(href); }
  };

  const formatAgo = (mins: number) => {
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <main className="overview fuel-view device-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.logger}</span>
          <div>
            <div className="screen-title">IRYS Device</div>
            <div className="screen-sub">IRYS LGR-200</div>
          </div>
        </div>
      </div>

      <SystemNav active="device" />

      {/* Hero: connectivity grammar instead of a generic ring + KPI tiles.
          The big number is the count actually drawing the dispatcher's
          attention (offline count when any unit is offline; otherwise the
          green online count). */}
      <section className="system-hero device-hero" aria-label="Fleet connectivity">
        <div className="system-hero-signature">
          <div className="system-hero-eyebrow">FLEET CONNECTIVITY</div>
          <div className={`system-hero-readout ${summary.offline > 0 ? "has-offline" : ""}`}>
            {summary.offline > 0 ? (
              <>
                <span className="num">{summary.offline}</span>
                <span className="of">offline of {summary.total}</span>
              </>
            ) : (
              <>
                <span className="num" style={{ color: "var(--ok)" }}>{summary.online}</span>
                <span className="of">online of {summary.total}</span>
              </>
            )}
          </div>
          <div className="device-hero-bands">
            <div className="device-hero-band fresh" title="Reporting in last 15 minutes">
              <div className="device-hero-band-label">Online</div>
              <div className="device-hero-band-num">{summary.online}</div>
              <div className="device-hero-band-hint">≤ 15m</div>
            </div>
            <div className="device-hero-band stale" title="No telemetry in over 15 minutes">
              <div className="device-hero-band-label">Offline</div>
              <div className="device-hero-band-num">{summary.offline}</div>
              <div className="device-hero-band-hint">&gt; 15m</div>
            </div>
          </div>
        </div>

      </section>

      <Card title="UNIT CONNECTIVITY" subtitle={`${rows.length} of ${units.length} units`}
        actions={
          <label className={`toggle-pill ${showOnlyOffline ? "is-active" : ""}`}>
            <input type="checkbox" checked={showOnlyOffline} onChange={(e) => setShowOnlyOffline(e.target.checked)} />
            <span>{showOnlyOffline ? "Filtered: offline only" : "Only Offline"}</span>
          </label>
        }>
        <div className="table-wrap">
          <table className="unit-table">
            <thead>
              <tr>
                <th onClick={() => setSort("id")} className={`sortable ${sortKey === "id" ? "active" : ""}`}><div className="th-inner">Unit <span className="sort-ico">{sortIco("id")}</span></div></th>
                <th>Type</th>
                <th onClick={() => setSort("online")} className={`sortable ${sortKey === "online" ? "active" : ""}`}><div className="th-inner">Connection <span className="sort-ico">{sortIco("online")}</span></div></th>
                <th onClick={() => setSort("minsAgo")} className={`sortable ${sortKey === "minsAgo" ? "active" : ""}`}><div className="th-inner">Last Seen <span className="sort-ico">{sortIco("minsAgo")}</span></div></th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="empty-row">No units match filter</td></tr>}
              {rows.slice(0, 200).map((u) => {
                const href = `/system/device/${encodeURIComponent(u.id)}` as Route;
                const dark = u.minsAgo > 60 * 24;
                return (
                  <tr
                    key={u.id}
                    onClick={() => goTo(href)}
                    onKeyDown={(e) => onRowKey(e, href)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open unit ${u.id} detail`}
                    className="unit-row"
                  >
                    <td className="unit-id"><Link href={href} className="unit-id-link" onClick={(e) => e.stopPropagation()}>{u.id}</Link></td>
                    <td className="muted">{u.type}</td>
                    <td><ConnPill online={u.online} /></td>
                    <td><span className={!u.online ? "delta-bad" : "delta-ok"}>{formatAgo(u.minsAgo)}</span></td>
                    <td className="muted">{dark ? <span className="val-nodata">—</span> : u.lastUpdate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
