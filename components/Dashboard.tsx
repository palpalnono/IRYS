"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Unit, Alert, Stats, FleetType } from "@/lib/data";
import type { FleetDateRange } from "@/lib/date-range";
import { Card, RingGauge, SysIcon } from "./atoms";
import DonutBreakdown from "./DonutBreakdown";
import Header from "./Header";
import DateRangeControl from "./DateRangeControl";

interface Props {
  units: Unit[];
  alerts: Alert[];
  stats: Stats;
  lastUpdate: string;
  dateRange: FleetDateRange;
}

// Pick the loudest failing subsystem for a not-ready unit so the dispatcher
// reads a single dominant cause per row. Fire/Lube/Fuel/GPS priority follows
// the per-device legend order on the donut so colors agree across the page.
const SUBSYSTEM_ORDER: { key: "fire" | "lube" | "fuel" | "gps"; label: string; color: string }[] = [
  { key: "fire", label: "Fire", color: "#FF7500" },
  { key: "lube", label: "Lube", color: "#3B82F6" },
  { key: "fuel", label: "Fuel", color: "#FACC15" },
  { key: "gps", label: "GPS", color: "#A855F7" },
];

function dominantSubsystem(u: Unit) {
  for (const s of SUBSYSTEM_ORDER) if (u[s.key] === "NOT OK") return s;
  return null;
}

// Fleet composition is presented as a single hairline stacked bar so the
// shape of the row varies tile-to-tile (number + bar, not number + icon).
// Order matches mass — heaviest types first — so the bar reads left to right
// as "what most of the fleet is."
const FLEET_TYPE_ORDER: { type: FleetType; short: string }[] = [
  { type: "Excavator", short: "EXC" },
  { type: "Dump Truck", short: "TRK" },
  { type: "Wheel Loader", short: "LDR" },
  { type: "Bulldozer", short: "DZR" },
];

export default function Dashboard({ units, alerts, stats, lastUpdate, dateRange }: Props) {
  const [donutHover, setDonutHover] = useState<number | null>(null);

  const composition = useMemo(() => {
    const counts: Record<FleetType, number> = {
      "Excavator": 0,
      "Dump Truck": 0,
      "Wheel Loader": 0,
      "Bulldozer": 0,
    };
    for (const u of units) counts[u.type]++;
    return FLEET_TYPE_ORDER.map((t) => ({ ...t, count: counts[t.type] }));
  }, [units]);

  // Open-alerts surface for the new fourth tile. Sorted freshest-first so
  // the dispatcher reads the most recent fault immediately. The header
  // already declares .nav-badge for this count but doesn't render it; the
  // tile makes the open count visible where it belongs operationally.
  const openAlerts = useMemo(
    () =>
      alerts
        .filter((a) => a.status === "open")
        .slice()
        .sort((a, b) => a.minsAgo - b.minsAgo),
    [alerts],
  );
  const openAlertsCount = openAlerts.length;
  const openAlertsPreview = openAlerts.slice(0, 3);

  const breakdown = useMemo(() => {
    const c = { fuel: 0, lube: 0, fire: 0, gps: 0 };
    for (const u of units)
      if (u.status === "NOT READY") {
        if (u.fuel === "NOT OK") c.fuel++;
        if (u.lube === "NOT OK") c.lube++;
        if (u.fire === "NOT OK") c.fire++;
        if (u.gps === "NOT OK") c.gps++;
      }
    return c;
  }, [units]);

  // Sorted list of NOT-READY units, freshest fault first (smallest minsAgo).
  // The dispatcher's first job is "name the units that are down right now."
  const notReadyUnits = useMemo(
    () => units.filter((u) => u.status === "NOT READY").slice().sort((a, b) => a.minsAgo - b.minsAgo),
    [units],
  );

  const sysHealth = useMemo(() => {
    const cats: ("fuel" | "lube" | "fire" | "gps")[] = ["fuel", "lube", "fire", "gps"];
    const out: Record<string, { normal: number; fault: number }> = {};
    for (const cat of cats) {
      const fault = units.filter((u) => u[cat] === "NOT OK").length;
      out[cat] = { normal: units.length - fault, fault };
    }
    const loggerFault = units.filter((u) => !u.online).length;
    out.logger = { normal: units.length - loggerFault, fault: loggerFault };
    return out;
  }, [units]);

  const legendRows = useMemo(
    () => [
      { key: "fuel", label: "Fuel", count: breakdown.fuel, color: "#FACC15" },
      { key: "lube", label: "Lube", count: breakdown.lube, color: "#3B82F6" },
      { key: "fire", label: "Fire", count: breakdown.fire, color: "#FF7500" },
      { key: "gps", label: "GPS", count: breakdown.gps, color: "#A855F7" },
    ],
    [breakdown],
  );
  const visibleLegendRows = legendRows.filter((s) => s.count > 0);
  // Map every visible legend index back to its full-array index so hover state
  // stays consistent with the donut (which reads from the filtered slices).
  const legendIndexMap = legendRows
    .map((row, i) => ({ row, i }))
    .filter((x) => x.row.count > 0);

  return (
    <div className="app density-comfortable" data-screen-label="IRYS Dashboard">
      <div className="bg-spotlight" />
      <Header view="overview" lastUpdate={lastUpdate} />
      <DateRangeControl range={dateRange} />
      <main className="overview">
        {/* KPI tiles — four structurally distinct shapes so the row reads as
            an instrument cluster, not a SaaS hero-metric strip:
            (1) ring gauge, (2) big number + composition bar, (3) dual split-fill,
            (4) number + open-alerts list-line preview. */}
        <div className="kpi-row">
          {/* Slot 1 — Fleet availability: ring + ready/total fraction. */}
          <div className="kpi-tile kpi-tile-availability">
            <div className="kpi-title">FLEET AVAILABILITY</div>
            <div className="kpi-availability">
              <RingGauge
                size={160}
                strokeWidth={14}
                segments={[
                  { value: stats.availability, color: "var(--ok)" },
                  { value: 100 - stats.availability, color: "rgba(255,255,255,0.06)" },
                ]}
                centerValue={`${stats.availability}%`}
                sublabel="Target ≥ 90%"
              />
            </div>
            <div className="kpi-avail-meta">
              <span className="kpi-avail-frac">
                <span className="kpi-avail-frac-num">{stats.ready}</span>
                <span className="kpi-avail-frac-sep">/</span>
                <span className="kpi-avail-frac-num kpi-avail-frac-total">{stats.total}</span>
              </span>
              <span className="kpi-avail-frac-label">units ready</span>
            </div>
          </div>

          {/* Slot 2 — Fleet composition: total + hairline stacked bar of types. */}
          <Link href="/units" className="kpi-tile kpi-tile-composition clickable" title="View all units">
            <div className="kpi-title">
              FLEET COMPOSITION
              <span className="kpi-chev">›</span>
            </div>
            <div className="kpi-comp-num-row">
              <div className="kpi-num">{stats.total}</div>
              <div className="kpi-comp-num-label">units total</div>
            </div>
            <div
              className="kpi-comp-bar"
              role="img"
              aria-label={`Fleet composition: ${composition
                .map((c) => `${c.count} ${c.type}`)
                .join(", ")}`}
            >
              {composition.map((c) =>
                c.count > 0 ? (
                  <span
                    key={c.type}
                    className="kpi-comp-seg"
                    style={{ flexGrow: c.count }}
                    title={`${c.count} ${c.type}${c.count === 1 ? "" : "s"}`}
                  />
                ) : null,
              )}
            </div>
            <div className="kpi-comp-legend">
              {composition.map((c) => (
                <span key={c.type} className="kpi-comp-legend-row">
                  <span className="kpi-comp-legend-label">{c.short}</span>
                  <span className="kpi-comp-legend-count">{c.count}</span>
                </span>
              ))}
            </div>
          </Link>

          {/* Slot 3 — Readiness: two parallel counters (NOT READY vs READY)
              separated by the hairline divider. Both counters deep-link to
              their respective filter on /units. The proportional fill bar
              below carries the same ready/not-ready split visually. */}
          <div className="kpi-tile kpi-tile-readiness" role="group" aria-label="Fleet readiness">
            <div className="kpi-title">FLEET READINESS</div>
            <div className="kpi-readiness-body">
              <Link
                href="/units?status=ready"
                className="kpi-readiness-anchor kpi-readiness-anchor--ready"
                title="View ready units"
                aria-label={`${stats.ready} ready units`}
              >
                <span className="kpi-num kpi-ok">{stats.ready}</span>
                <span className="kpi-readiness-anchor-label">READY</span>
              </Link>
              <Link
                href="/units?status=not-ready"
                className="kpi-readiness-anchor"
                title="View not-ready units"
                aria-label={`${stats.notReady} not-ready units`}
              >
                <span className={`kpi-num ${stats.notReady > 0 ? "kpi-bad" : "kpi-ok"}`}>
                  {stats.notReady}
                </span>
                <span className="kpi-readiness-anchor-label">
                  {stats.notReady === 0 ? "ALL READY" : "NOT READY"}
                </span>
              </Link>
            </div>
            <div
              className="kpi-split-fill"
              role="img"
              aria-label={`${stats.ready} of ${stats.total} units ready`}
            >
              <span className="kpi-split-fill-ready" style={{ flexGrow: stats.ready }} />
              <span className="kpi-split-fill-bad" style={{ flexGrow: Math.max(stats.notReady, 0) }} />
            </div>
          </div>

          {/* Slot 4 — Open alerts: count + freshest-3 list-line preview. */}
          <Link
            href="/alerts"
            className={`kpi-tile kpi-tile-alerts clickable ${openAlertsCount > 0 ? "tone-bad" : "tone-ok"}`}
            title="View alerts"
          >
            <div className="kpi-title">
              OPEN ALERTS
              <span className="kpi-chev">›</span>
            </div>
            <div className="kpi-alerts-num-row">
              <div className={`kpi-num ${openAlertsCount > 0 ? "kpi-bad" : "kpi-ok"}`}>
                {openAlertsCount}
              </div>
              <div className="kpi-alerts-num-label">
                {openAlertsCount === 1 ? "open incident" : "open incidents"}
              </div>
            </div>
            {openAlertsPreview.length > 0 ? (
              <ul className="kpi-alerts-list" aria-label="Most recent open alerts">
                {openAlertsPreview.map((a) => (
                  <li key={a.id} className="kpi-alerts-row">
                    <span className="kpi-alerts-dot" aria-hidden="true" />
                    <span className="kpi-alerts-unit">{a.unitId}</span>
                    <span className="kpi-alerts-msg" title={a.message}>
                      {a.message}
                    </span>
                    <span className="kpi-alerts-time">{a.minsAgo}m</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="kpi-alerts-empty">
                <span className="kpi-alerts-empty-mark" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path
                      d="M4 7.2l2 2 4-4.4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
                Fleet clear. No open incidents.
              </div>
            )}
          </Link>
        </div>

        {/* Mid row */}
        <div className="mid-row">
          <Card title="NOT READY BREAKDOWN" subtitle="By subsystem">
            <div className="breakdown-donut">
              <DonutBreakdown
                size={180}
                strokeWidth={30}
                hovered={donutHover}
                onHover={setDonutHover}
                slices={visibleLegendRows.map((s) => ({
                  key: s.key,
                  value: s.count,
                  color: s.color,
                  label: s.label,
                }))}
                centerTop="NOT READY"
                centerBig={stats.notReady}
                centerSub="units"
              />
              <div className="breakdown-list">
                {notReadyUnits.length === 0 ? (
                  <div className="breakdown-empty">
                    <div className="breakdown-empty-mark">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="10" cy="10" r="8.5" stroke="var(--ok)" strokeWidth="1.5" />
                        <path d="M6 10l3 3 5-6" stroke="var(--ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                    <div className="breakdown-empty-title">All units ready</div>
                    <div className="breakdown-empty-sub">No NOT READY units in the fleet.</div>
                  </div>
                ) : (
                  <>
                    <div className="breakdown-list-head">Units down now</div>
                    <div className="breakdown-list-rows">
                      {notReadyUnits.slice(0, 7).map((u) => {
                        const sub = dominantSubsystem(u);
                        return (
                          <Link
                            key={u.id}
                            href={`/unit/${u.id}`}
                            className="breakdown-unit"
                            title={`Open ${u.id} details`}
                          >
                            <span className="breakdown-unit-id">{u.id}</span>
                            {sub ? (
                              <span className="breakdown-unit-cause">
                                <span
                                  className="breakdown-unit-dot"
                                  style={{ background: sub.color }}
                                  aria-hidden="true"
                                />
                                <span className="breakdown-unit-cause-label">{sub.label}</span>
                              </span>
                            ) : (
                              <span className="breakdown-unit-cause">
                                <span
                                  className="breakdown-unit-dot breakdown-unit-dot-muted"
                                  aria-hidden="true"
                                />
                                <span className="breakdown-unit-cause-label">—</span>
                              </span>
                            )}
                            <span className="breakdown-unit-time">{u.minsAgo}m</span>
                            <span className="breakdown-unit-chev" aria-hidden="true">›</span>
                          </Link>
                        );
                      })}
                    </div>
                    {notReadyUnits.length > 7 && (
                      <Link
                        href="/units?status=not-ready"
                        className="breakdown-list-more"
                        title="View all not-ready units"
                      >
                        +{notReadyUnits.length - 7} more
                        <span className="breakdown-list-more-chev" aria-hidden="true">›</span>
                      </Link>
                    )}
                    {visibleLegendRows.length > 0 && (
                      <div
                        className="breakdown-tags"
                        role="list"
                        aria-label="Not ready by subsystem"
                      >
                        {visibleLegendRows.map((s, vi) => {
                          const fullIdx = legendIndexMap[vi].i;
                          return (
                            <span
                              key={s.key}
                              role="listitem"
                              tabIndex={0}
                              className={`breakdown-tag ${donutHover === fullIdx ? "hover" : ""}`}
                              onMouseEnter={() => setDonutHover(fullIdx)}
                              onMouseLeave={() => setDonutHover(null)}
                              onFocus={() => setDonutHover(fullIdx)}
                              onBlur={() => setDonutHover(null)}
                              aria-label={`${s.label}: ${s.count} ${s.count === 1 ? "unit" : "units"}`}
                            >
                              <span
                                className="breakdown-tag-dot"
                                style={{ background: s.color }}
                                aria-hidden="true"
                              />
                              <span className="breakdown-tag-label">{s.label}</span>
                              <span className="breakdown-tag-count">{s.count}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card title="SYSTEM HEALTH" subtitle="By subsystem" wide>
            <div className="sys-health">
              {([
                { k: "fuel", label: "CAS", icon: SysIcon.logger, sub: "STONKAM", href: "/system/cas" },
                { k: "lube", label: "LUBE", icon: SysIcon.lube, sub: "G2 TIMER", href: "/system/lube" },
                { k: "fire", label: "FIRE", icon: SysIcon.fire, sub: "ANSUL", href: "/system/fire" },
                { k: "gps", label: "GPS", icon: SysIcon.gps, sub: " ", href: "/system/gps" },
                { k: "logger", label: "LOGGER", icon: SysIcon.logger, sub: "IRYS DEVICE", href: "/system/device" },
              ] as const).map((cfg) => {
                const { k, label, icon, sub } = cfg;
                const href = "href" in cfg ? cfg.href : undefined;
                const h = sysHealth[k];
                const inner = (
                  <>
                    <div className="sys-head">
                      <div className="sys-icon">{icon}</div>
                      <div>
                        <div className="sys-name">{label}</div>
                        <div className="sys-sub">{sub}</div>
                      </div>
                    </div>
                    <RingGauge
                      size={120}
                      strokeWidth={11}
                      segments={[
                        { value: h.normal, color: "var(--ok)" },
                        { value: h.fault, color: "var(--bad)" },
                      ]}
                      centerLabel={h.fault === 0 ? "NORMAL" : "FAULT"}
                      centerValue={h.fault > 0 ? h.fault : h.normal}
                    />
                  </>
                );
                return href ? (
                  <Link key={k} href={href} className="sys-cell sys-cell-link" title={`Open ${label} details`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={k} className="sys-cell">{inner}</div>
                );
              })}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
