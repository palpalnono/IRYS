"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Unit } from "@/lib/data";
import { Card, StatusChip, SysIcon } from "./atoms";
import SystemNav from "./SystemNav";
import BackButton from "./BackButton";

type SortKey = "id" | "speed" | "status";



export default function GpsView({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const rows = useMemo(() => {
    const filtered = showOnlyIssues ? units.filter((u) => u.gps === "NOT OK") : units;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "speed") cmp = a.telemetry.gps.speed - b.telemetry.gps.speed;
      else if (sortKey === "status") cmp = a.gps.localeCompare(b.gps);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [units, sortKey, sortDir, showOnlyIssues]);

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "id" ? "asc" : "desc"); }
  };
  const sortIco = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕");
  const goTo = (href: Route) => router.push(href);
  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, href: Route) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(href); }
  };

  return (
    <main className="overview fuel-view gps-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.gps}</span>
          <div>
            <div className="screen-title">GPS</div>
            <div className="screen-sub">u-blox NEO-M8N</div>
          </div>
        </div>
      </div>

      <SystemNav active="gps" />

      <Card title="UNIT GPS STATE" subtitle={`${rows.length} of ${units.length} units`}
        actions={
          <label className={`toggle-pill ${showOnlyIssues ? "is-active" : ""}`}>
            <input type="checkbox" checked={showOnlyIssues} onChange={(e) => setShowOnlyIssues(e.target.checked)} />
            <span>{showOnlyIssues ? "Filtered: faults only" : "Only Faults"}</span>
          </label>
        }>
        <div className="table-wrap">
          <table className="unit-table">
            <thead>
              <tr>
                <th onClick={() => setSort("id")} className={`sortable ${sortKey === "id" ? "active" : ""}`}><div className="th-inner">Unit <span className="sort-ico">{sortIco("id")}</span></div></th>
                <th>Type</th>
                <th>Coordinates</th>
                <th onClick={() => setSort("speed")} className={`sortable ${sortKey === "speed" ? "active" : ""}`}><div className="th-inner">Speed <span className="sort-ico">{sortIco("speed")}</span></div></th>
                <th onClick={() => setSort("status")} className={`sortable ${sortKey === "status" ? "active" : ""}`}><div className="th-inner">Status <span className="sort-ico">{sortIco("status")}</span></div></th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="empty-row">No units match filter</td></tr>}
              {rows.slice(0, 200).map((u) => {
                const href = `/system/gps/${encodeURIComponent(u.id)}` as Route;
                const t = u.telemetry.gps;
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
                    <td className="coords">
                      <div>{u.online ? t.lat : <span className="val-nodata">NO DATA</span>}</div>
                      <div>{u.online ? t.lon : <span className="val-nodata">—</span>}</div>
                    </td>
                    <td>
                      {u.online ? `${t.speed} km/h` : <span className="val-nodata">NO DATA</span>}
                    </td>
                    <td><StatusChip status={u.gps} size="sm" /></td>
                    <td className="muted">{u.lastUpdate}</td>
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
