"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Alert } from "@/lib/data";
import { Card } from "./atoms";

const PAGE_SIZE = 10;

// Subsystem inference from the alert message string. Every Alert in the
// current data layer carries `severity: "critical"`, so a severity filter
// is dishonest UI. The honest distinguisher is the originating subsystem,
// which we can derive from the message text without touching lib/data.ts
// (a reserved file). When the data layer eventually carries a real
// severity ladder, this helper can stay or be replaced by a real field.
type Subsystem = "fuel" | "lube" | "fire" | "gps" | "device";
function classifySubsystem(message: string): Subsystem {
  const m = message.toLowerCase();
  if (m.includes("fuel") || m.includes("flowrate")) return "fuel";
  if (m.includes("lube") || m.includes("g2 timer")) return "lube";
  if (m.includes("fire") || m.includes("ansul") || m.includes("discharge") || m.includes("release valve") || m.includes("isolation") || m.includes("engine shutdown")) return "fire";
  if (m.includes("gps")) return "gps";
  return "device";
}

const SUBSYSTEM_LABELS: Record<Subsystem | "all", string> = {
  all: "All systems",
  fuel: "Fuel",
  lube: "Lube",
  fire: "Fire",
  gps: "GPS",
  device: "Device",
};

const SUBSYSTEM_ORDER: (Subsystem | "all")[] = ["all", "fuel", "lube", "fire", "gps", "device"];

type ToastState = { id: string; alertId: string; unitId: string; expiresAt: number } | null;

export default function AlertsView({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  // Decision 2: Replace severity filter (decorative — every Alert is "critical")
  // with a Subsystem filter derived from the alert's root-cause message.
  // We chose replacement over removal because (a) the maintenance lead's
  // "is this a fuel problem or a fire problem?" question is real and
  // currently unanswerable, (b) it preserves the header layout shape so
  // less CSS churn, and (c) it reuses the same `.sev-pill` chip vocabulary,
  // just relabeled. The class names stay `sev-pill` for CSS continuity;
  // the data they represent is now subsystem, not severity.
  const [system, setSystem] = useState<Subsystem | "all">("all");

  // Range options for the not-ready-history chart.
  // Hourly buckets for short windows, daily buckets for the 7-day view.
  type RangeKey = "8h" | "12h" | "24h" | "7d";
  const RANGES: Record<RangeKey, { label: string; subtitle: string; buckets: number; bucketMins: number; suffix: string }> = {
    "8h":  { label: "8h",  subtitle: "Last 8 hours · hourly buckets",  buckets: 8,  bucketMins: 60,       suffix: "h" },
    "12h": { label: "12h", subtitle: "Last 12 hours · hourly buckets", buckets: 12, bucketMins: 60,       suffix: "h" },
    "24h": { label: "24h", subtitle: "Last 24 hours · hourly buckets", buckets: 24, bucketMins: 60,       suffix: "h" },
    "7d":  { label: "7d",  subtitle: "Last 7 days · daily buckets",    buckets: 7,  bucketMins: 60 * 24,  suffix: "d" },
  };
  const [range, setRange] = useState<RangeKey>("24h");
  const r = RANGES[range];

  // Decision 1: Optimistic local Resolve. resolvedIds tracks alerts the
  // user has resolved in this session. The set is initialized empty (the
  // initial truth comes from each alert's `status` field) and an alert is
  // treated as resolved if either its server status === "resolved" OR its
  // id is in resolvedIds. No backend wiring, no lib/data.ts mutation;
  // state resets on hard reload, which is an accepted limitation.
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveStatus = useCallback(
    (a: Alert): "open" | "resolved" => (resolvedIds.has(a.id) ? "resolved" : a.status),
    [resolvedIds],
  );

  const handleResolve = useCallback((alertId: string, unitId: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const expiresAt = Date.now() + 6000;
    setToast({ id: `t-${alertId}-${expiresAt}`, alertId, unitId, expiresAt });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t && t.alertId === alertId ? null : t));
    }, 6000);
  }, []);

  const handleUndo = useCallback((alertId: string) => {
    setResolvedIds((prev) => {
      if (!prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Window in minutes for the timeline — same range as the history chart.
  const windowMins = r.buckets * r.bucketMins;
  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (a.minsAgo > windowMins) return false;
        const status = effectiveStatus(a);
        if (filter !== "all" && status !== filter) return false;
        if (system !== "all" && classifySubsystem(a.message) !== system) return false;
        return true;
      }),
    [alerts, filter, system, windowMins, effectiveStatus],
  );

  // Counts scoped to the windowed set (not the full alerts array) so the
  // header subtitle matches what the timeline actually shows.
  const windowed = useMemo(
    () => alerts.filter((a) => a.minsAgo <= windowMins),
    [alerts, windowMins],
  );
  const openCount = useMemo(
    () => windowed.filter((a) => effectiveStatus(a) === "open").length,
    [windowed, effectiveStatus],
  );
  const resolvedCount = useMemo(
    () => windowed.filter((a) => effectiveStatus(a) === "resolved").length,
    [windowed, effectiveStatus],
  );

  // Infinite-scroll: render PAGE_SIZE rows at first, grow by PAGE_SIZE
  // whenever the bottom sentinel enters the scroll viewport. Reset on
  // any filter change so users always start from the top.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [filter, system, range]);

  // Track the latest filtered length without rebinding the observer.
  // Refreshed on every render so the cap inside the callback stays current.
  const filteredLenRef = useRef(filtered.length);
  filteredLenRef.current = filtered.length;

  // Callback ref: set up the observer once when the sentinel attaches,
  // tear it down only when the sentinel detaches (filter cleared, end
  // reached, unmount). visibleCount changes do not recreate the observer
  // — it stays alive across every infinite-scroll reveal.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredLenRef.current));
        }
      },
      { root: node.closest(".timeline"), rootMargin: "120px" },
    );
    observerRef.current.observe(node);
  }, []);

  const visible = filtered.slice(0, visibleCount);

  // Distinct not-ready unit count per bucket over the selected window.
  // We treat any alert in that bucket as a "unit was not ready" observation
  // and dedupe on unitId so the count tops out at fleet size, not alert count.
  const buckets = useMemo(() => {
    const sets: Set<string>[] = Array.from({ length: r.buckets }, () => new Set<string>());
    for (const a of alerts) {
      const idx = Math.floor(a.minsAgo / r.bucketMins);
      if (idx >= 0 && idx < r.buckets) sets[idx].add(a.unitId);
    }
    return sets.map((s) => s.size);
  }, [alerts, r.buckets, r.bucketMins]);

  const maxBucket = Math.max(...buckets, 1);
  const midBucket = Math.round(maxBucket / 2);

  const resetFilters = useCallback(() => {
    setFilter("all");
    setSystem("all");
  }, []);

  const filtersActive = filter !== "all" || system !== "all";

  // Relative-time label for an alert (used in the time column for
  // 8h / 12h / 24h windows). For 7d we fall back to the date.
  const relativeLabel = useCallback((minsAgo: number): string => {
    if (minsAgo < 1) return "now";
    if (minsAgo < 60) return `${Math.round(minsAgo)}m ago`;
    const hours = Math.floor(minsAgo / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  // Human-readable bucket-edge label: "8h ago", "now", "−3h" etc.
  const bucketAnchorLabel = useCallback((bucketIdx: number, total: number, suffix: string): string => {
    // bucketIdx 0 is the most-recent bucket (0–1h ago). We render right-to-left
    // so the rightmost label needs to read "now" or "1h ago"; the leftmost
    // reads "{total}{suffix} ago".
    if (bucketIdx === 0) return `1${suffix} ago`;
    if (bucketIdx === total - 1) return `${total}${suffix} ago`;
    return `${bucketIdx + 1}${suffix}`;
  }, []);

  return (
    <main className="alerts">
      <div className="alerts-header">
        <div className="alerts-header-title">
          <div className="screen-title">Alerts &amp; Incidents</div>
          <div className="screen-sub">
            <span className="tabular-nums">{openCount}</span> open ·{" "}
            <span className="tabular-nums">{resolvedCount}</span> resolved · last {range}
          </div>
        </div>
        <div className="alerts-tabs">
          {([
            ["all", "All"],
            ["open", "Open"],
            ["resolved", "Resolved"],
          ] as const).map(([k, l]) => (
            <button key={k} className={`tab ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)} type="button">
              {l}
            </button>
          ))}
        </div>
      </div>

      <Card
        title="NOT READY HISTORY"
        subtitle={r.subtitle}
        actions={
          <div className="alerts-tabs">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <button
                key={k}
                className={`tab ${range === k ? "active" : ""}`}
                onClick={() => setRange(k)}
                type="button"
              >
                {RANGES[k].label}
              </button>
            ))}
          </div>
        }
      >
        <div className="volume-chart" role="group" aria-label="Not ready history bar chart">
          <div className="volume-yaxis" aria-hidden="true">
            <span className="volume-ytick volume-ytick-max">{maxBucket}</span>
            <span className="volume-ytick volume-ytick-mid">{midBucket}</span>
            <span className="volume-ytick volume-ytick-zero">0</span>
          </div>
          <div className="volume-plot">
            <div className="volume-bars">
              {buckets
                .map((v, i) => {
                  const height = (v / maxBucket) * 100;
                  const anchor = bucketAnchorLabel(i, r.buckets, r.suffix);
                  return (
                    <div key={i} className="vol-col">
                      <div
                        className="vol-bar"
                        style={{ height: `${height}%` }}
                        role="img"
                        aria-label={`${v} distinct ${v === 1 ? "unit" : "units"} not ready, ${anchor}`}
                      >
                        {v > 0 && <span className="vol-num tabular-nums">{v}</span>}
                      </div>
                    </div>
                  );
                })
                .reverse()}
            </div>
            <div className="volume-xaxis">
              <span className="volume-xlabel volume-xlabel-start">{r.buckets}{r.suffix} ago</span>
              <span className="volume-xlabel volume-xlabel-end">now</span>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="INCIDENT TIMELINE"
        subtitle={`${visible.length} of ${filtered.length} events · last ${range}`}
        actions={
          <div className="sev-filter" role="group" aria-label="Filter by subsystem">
            {SUBSYSTEM_ORDER.map((k) => (
              <button
                key={k}
                className={`sev-pill sev-${k} ${system === k ? "on" : ""}`}
                onClick={() => setSystem(k)}
                type="button"
              >
                {SUBSYSTEM_LABELS[k]}
              </button>
            ))}
          </div>
        }
      >
        <div className="timeline">
          {filtered.length === 0 ? (
            <div className="tl-empty">
              <div className="tl-empty-title">NO INCIDENTS IN THIS WINDOW</div>
              <div className="tl-empty-sub">
                Last {range} · <span className="tabular-nums">0</span> critical events
              </div>
              {filtersActive && (
                <button className="btn-sm tl-empty-action" type="button" onClick={resetFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {visible.map((a) => {
                const status = effectiveStatus(a);
                const subsystem = classifySubsystem(a.message);
                return (
                  <div key={a.id} className={`timeline-item sev-${a.severity} status-${status}`}>
                    <div className="tl-time">
                      <div className="tl-time-main tabular-nums">{a.time.split(" ")[1]}</div>
                      <div className="tl-time-date">
                        {range === "7d" ? a.time.split(" ")[0] : relativeLabel(a.minsAgo)}
                      </div>
                    </div>
                    <div className={`tl-marker sev-${a.severity}`} />
                    <div className="tl-body">
                      <div className="tl-head-row">
                        <span className={`sev-tag sys-${subsystem}`}>{SUBSYSTEM_LABELS[subsystem].toUpperCase()}</span>
                        <button
                          className="tl-unit-link"
                          type="button"
                          onClick={() => router.push(`/unit/${encodeURIComponent(a.unitId)}` as Route)}
                        >
                          {a.unitId}
                        </button>
                        <span className={`tl-status status-${status}`}>{status.toUpperCase()}</span>
                      </div>
                      <div className="tl-msg">{a.message}</div>
                    </div>
                    <div className="tl-actions">
                      {status === "open" && (
                        <button
                          className="btn-sm"
                          type="button"
                          onClick={() => handleResolve(a.id, a.unitId)}
                          aria-label={`Resolve alert for ${a.unitId}`}
                        >
                          Resolve
                        </button>
                      )}
                      {status === "resolved" && <span className="resolved-badge">✓ Resolved</span>}
                    </div>
                  </div>
                );
              })}
              {visibleCount < filtered.length && (
                <div ref={sentinelRef} className="tl-sentinel">Loading more…</div>
              )}
              {visibleCount >= filtered.length && filtered.length > 0 && (
                <div className="tl-sentinel tl-sentinel-end">
                  End of timeline · <span className="tabular-nums">{filtered.length}</span> total
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Toast: lives in the bottom-right; aria-live polite so screen readers
          announce the resolve confirmation. Undo affordance lasts ~6s. */}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="toast" key={toast.id}>
            <span className="toast-msg">
              Alert on <span className="tabular-nums">{toast.unitId}</span> resolved
            </span>
            <button
              className="toast-undo"
              type="button"
              onClick={() => handleUndo(toast.alertId)}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
