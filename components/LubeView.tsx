"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Unit } from "@/lib/data";
import { Card, StatusChip, SysIcon } from "./atoms";
import SystemNav from "./SystemNav";
import BackButton from "./BackButton";

type SortKey = "id" | "faults" | "state" | "status";

export default function LubeView({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("faults");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const summary = useMemo(() => {
    const total = units.length;
    const fault = units.filter((u) => u.lube === "NOT OK").length;
    const normal = total - fault;
    const running = units.filter((u) => u.online && u.telemetry.lube.state === "RUN").length;
    const paused = units.filter((u) => u.online && u.telemetry.lube.state === "PAUSE").length;
    const offline = units.filter((u) => !u.online).length;
    return { total, fault, normal, running, paused, offline };
  }, [units]);

  const rows = useMemo(() => {
    const filtered = showOnlyIssues ? units.filter((u) => u.lube === "NOT OK") : units;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "faults") cmp = a.telemetry.lube.faultCount - b.telemetry.lube.faultCount;
      else if (sortKey === "state") cmp = a.telemetry.lube.state.localeCompare(b.telemetry.lube.state);
      else if (sortKey === "status") cmp = a.lube.localeCompare(b.lube);
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

  // Hero verdict: if any fault exists, the panel's primary number is the
  // fault count (red); otherwise the panel reports running units (green).
  // The pulse mirrors the LubeStateBadge metaphor for the fleet, not a unit.
  const heroMode: "running" | "fault" | "idle" =
    summary.fault > 0 ? "fault" : summary.running > 0 ? "running" : "idle";
  const heroNum = heroMode === "fault" ? summary.fault : summary.running;
  const heroLabel =
    heroMode === "fault" ? "FAULT" : heroMode === "running" ? "RUNNING" : "IDLE";
  const heroSub =
    heroMode === "fault"
      ? `${summary.fault} of ${summary.total} units in fault`
      : `${summary.running} of ${summary.total} units cycling`;

  return (
    <main className="overview fuel-view lube-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.lube}</span>
          <div>
            <div className="screen-title">Lube System</div>
            <div className="screen-sub">G2 TIMER</div>
          </div>
        </div>
      </div>

      <SystemNav active="lube" />

      {/* Hero: a single LubeStateBadge metaphor for the whole fleet. Replaces the
          generic 4-up KPI grid with the subsystem's own grammar. */}
      <section className="system-hero lube-hero lube-hero-summary-only" aria-label="Fleet lube cycle">
        <div className="system-hero-signature">
          <div className="system-hero-eyebrow">FLEET CYCLE</div>
          <div className="lube-hero-stack">
            <div className={`lube-hero-circle ${heroMode}`} role="img" aria-label={heroSub}>
              <div className="lube-hero-num">{heroNum}</div>
              <div className="lube-hero-label">{heroLabel}</div>
            </div>
            <div className="system-hero-bullets" aria-label="Fleet lube state breakdown">
              <span className="system-hero-bullet">
                <span className="swatch" style={{ background: "var(--ok)" }} />
                <span className="count">{summary.running}</span> running
              </span>
              <span className="system-hero-bullet">
                <span className="swatch" style={{ background: "rgba(255,255,255,0.40)" }} />
                <span className="count">{summary.paused}</span> on pause
              </span>
              <span className="system-hero-bullet">
                <span className="swatch" style={{ background: "var(--bad)" }} />
                <span className="count">{summary.fault}</span> fault
              </span>
              {summary.offline > 0 && (
                <span className="system-hero-bullet">
                  <span className="swatch" style={{ background: "rgba(255,255,255,0.20)" }} />
                  <span className="count">{summary.offline}</span> no data
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <Card title="UNIT LUBE STATE" subtitle={`${rows.length} of ${units.length} units`}
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
                <th onClick={() => setSort("state")} className={`sortable ${sortKey === "state" ? "active" : ""}`}><div className="th-inner">Run / Pause <span className="sort-ico">{sortIco("state")}</span></div></th>
                <th onClick={() => setSort("faults")} className={`sortable ${sortKey === "faults" ? "active" : ""}`}><div className="th-inner">Fault Count <span className="sort-ico">{sortIco("faults")}</span></div></th>
                <th onClick={() => setSort("status")} className={`sortable ${sortKey === "status" ? "active" : ""}`}><div className="th-inner">Status <span className="sort-ico">{sortIco("status")}</span></div></th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="empty-row">No units match filter</td></tr>}
              {rows.slice(0, 200).map((u) => {
                const href = `/system/lube/${encodeURIComponent(u.id)}` as Route;
                const fc = u.telemetry.lube.faultCount;
                const stateClass = !u.online ? "nodata" : u.telemetry.lube.state === "RUN" ? "run" : "pause";
                const stateLabel = !u.online ? "NO DATA" : u.telemetry.lube.state;
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
                      <span className={`lube-state-mini ${stateClass}`}>{stateLabel}</span>
                    </td>
                    <td><span className={fc > 0 ? "delta-bad" : "delta-ok"}>{fc > 0 ? `${fc} fault${fc > 1 ? "s" : ""}` : "No fault"}</span></td>
                    <td><StatusChip status={u.lube} size="sm" /></td>
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
