"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Unit } from "@/lib/data";
import { Card, MiniStatus, StatusChip, SysIcon } from "./atoms";
import SystemNav from "./SystemNav";
import BackButton from "./BackButton";

type SortKey = "id" | "detection" | "discharge" | "power" | "status";


export default function FireView({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const summary = useMemo(() => {
    const total = units.length;
    const fault = units.filter((u) => u.fire === "NOT OK").length;
    const normal = total - fault;
    const triggered = units.filter((u) => u.online && (u.telemetry.fire.detection1 === "TRIGGERED" || u.telemetry.fire.detection === "TRIGGERED")).length;
    const discharged = units.filter((u) => u.online && u.telemetry.fire.discharge === "YES").length;
    const powerLost = units.filter((u) => u.online && u.telemetry.fire.power === "LOST").length;
    return { total, fault, normal, triggered, discharged, powerLost };
  }, [units]);

  const rows = useMemo(() => {
    const filtered = showOnlyIssues ? units.filter((u) => u.fire === "NOT OK") : units;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      const ta = a.telemetry.fire, tb = b.telemetry.fire;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "detection") {
        const da = ta.detection1 === "TRIGGERED" || ta.detection === "TRIGGERED" ? 1 : 0;
        const db = tb.detection1 === "TRIGGERED" || tb.detection === "TRIGGERED" ? 1 : 0;
        cmp = da - db;
      }
      else if (sortKey === "discharge") cmp = ta.discharge.localeCompare(tb.discharge);
      else if (sortKey === "power") cmp = ta.power.localeCompare(tb.power);
      else if (sortKey === "status") cmp = a.fire.localeCompare(b.fire);
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

  // Hero strip: the three honest fire-panel conditions. Each cell is a
  // FirePanel-style indicator (dot + label + count). Throb when any unit
  // is alarming; calm green otherwise. This replaces the awkward 4-up
  // KPI grid that mixed FAULT and DETECTION TRIGGERED side by side.
  const strip = [
    { label: "Detection", count: summary.triggered, hint: summary.triggered === 1 ? "1 unit triggered" : `${summary.triggered} units triggered` },
    { label: "Discharge", count: summary.discharged, hint: summary.discharged === 1 ? "1 unit discharged" : `${summary.discharged} units discharged` },
    { label: "Power", count: summary.powerLost, hint: summary.powerLost === 1 ? "1 unit lost power" : `${summary.powerLost} units lost power` },
  ];

  return (
    <main className="overview fuel-view fire-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.fire}</span>
          <div>
            <div className="screen-title">Fire System</div>
            <div className="screen-sub">ANSUL</div>
          </div>
        </div>
      </div>

      <SystemNav active="fire" />

      {/* Hero: a FirePanel-style 3-cell strip (Detection / Discharge /
          Power) plus a 56-cell fleet field where each unit lights as
          calm or throbbing. Replaces the generic 4-up KPI grid. */}
      <section className="system-hero fire-hero" aria-label="Fleet fire status">
        <div className="system-hero-signature">
          <div className="system-hero-eyebrow">FAULT BREAKDOWN</div>
          <div className="system-hero-readout" aria-label={`${summary.fault} of ${summary.total} units in fault`}>
            <span className={`num ${summary.fault > 0 ? "bad" : "ok"}`}>{summary.fault}</span>
            <span className="of">of {summary.total} units in fault</span>
          </div>
          <div className="fire-hero-strip" role="list">
            {strip.map((s) => (
              <div
                key={s.label}
                className={`fire-hero-cell ${s.count > 0 ? "has-fault" : "calm"}`}
                role="listitem"
                title={s.hint}
              >
                <div className="fire-hero-cell-head">
                  <span className="fire-ind-light" aria-hidden />
                  {s.label}
                </div>
                <div className="fire-hero-cell-num">{s.count}</div>
                <div className="fire-hero-cell-meta">{s.count === 1 ? "1 unit" : `${s.count} units`}</div>
              </div>
            ))}
          </div>
        </div>

      </section>

      <Card title="UNIT FIRE STATE" subtitle={`${rows.length} of ${units.length} units`}
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
                <th onClick={() => setSort("detection")} className={`sortable ${sortKey === "detection" ? "active" : ""}`}><div className="th-inner">Detection <span className="sort-ico">{sortIco("detection")}</span></div></th>
                <th onClick={() => setSort("discharge")} className={`sortable ${sortKey === "discharge" ? "active" : ""}`}><div className="th-inner">Discharge <span className="sort-ico">{sortIco("discharge")}</span></div></th>
                <th onClick={() => setSort("power")} className={`sortable ${sortKey === "power" ? "active" : ""}`}><div className="th-inner">Power <span className="sort-ico">{sortIco("power")}</span></div></th>
                <th onClick={() => setSort("status")} className={`sortable ${sortKey === "status" ? "active" : ""}`}><div className="th-inner">Status <span className="sort-ico">{sortIco("status")}</span></div></th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="empty-row">No units match filter</td></tr>}
              {rows.slice(0, 200).map((u) => {
                const href = `/system/fire/${encodeURIComponent(u.id)}` as Route;
                const t = u.telemetry.fire;
                const detTriggered = t.detection1 === "TRIGGERED" || t.detection === "TRIGGERED";
                const detLabel = detTriggered ? "TRIGGERED" : "NORMAL";
                const detS = detTriggered ? "NOT OK" : "OK";
                const disS = t.discharge === "YES" ? "NOT OK" : "OK";
                const pwrS = t.power === "LOST" ? "NOT OK" : "OK";
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
                    <td>
                      <span className="fire-cell-mix">
                        <MiniStatus s={detS} />
                        <span className={detTriggered ? "delta-bad" : "delta-ok"}>{detLabel}</span>
                      </span>
                    </td>
                    <td>
                      <span className="fire-cell-mix">
                        <MiniStatus s={disS} />
                        <span className={t.discharge === "YES" ? "delta-bad" : "delta-ok"}>{t.discharge}</span>
                      </span>
                    </td>
                    <td>
                      <span className="fire-cell-mix">
                        <MiniStatus s={pwrS} />
                        <span className={t.power === "LOST" ? "delta-bad" : "delta-ok"}>{t.power}</span>
                      </span>
                    </td>
                    <td><StatusChip status={u.fire} size="sm" /></td>
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
