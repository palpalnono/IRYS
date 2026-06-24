"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import type { Unit } from "@/lib/data";
import { Card, ConnPill, StatusChip, SysIcon } from "./atoms";

const PAGE_SIZE = 10;

interface Props {
  units: Unit[];
}

const FLEET_TYPES = ["All Types", "Excavator", "Dump Truck", "Wheel Loader", "Bulldozer"] as const;
type FleetFilter = (typeof FLEET_TYPES)[number];
const isFleetFilter = (v: string | null): v is FleetFilter =>
  v !== null && (FLEET_TYPES as readonly string[]).includes(v);

const SORT_KEYS: ReadonlyArray<keyof Unit> = ["id", "type", "status"];
const isSortKey = (v: string | null): v is keyof Unit =>
  v !== null && (SORT_KEYS as readonly string[]).includes(v);

// One-glance fault inventory per row. We collapse the prior four binary
// device columns into a single "Faults" cell so each pixel of horizontal
// real-estate carries unique information. Status (chip), Faults (icons),
// and Root Cause (text) still satisfy the Three-Channel Rule — glyph,
// position, and label are each present on a NOT-READY row.
type FaultKey = "fire" | "fuel" | "lube" | "gps";
type FaultFilter = "all" | FaultKey;
type FaultIconKey = FaultKey | "logger";

const FAULT_DEVICES: Array<{ key: FaultKey; label: string; filterLabel?: string; icon: FaultIconKey }> = [
  { key: "fire", label: "Fire", icon: "fire" },
  { key: "fuel", label: "CAS", filterLabel: "CAS", icon: "logger" },
  { key: "lube", label: "Lube", icon: "lube" },
  { key: "gps", label: "GPS", icon: "gps" },
];
const isFaultFilter = (v: string | null): v is FaultFilter =>
  v === "all" || FAULT_DEVICES.some((device) => device.key === v);

function FaultsCell({ unit }: { unit: Unit }) {
  const faulting = FAULT_DEVICES.filter((d) => unit[d.key] === "NOT OK");
  if (faulting.length === 0) {
    return <span className="faults-cell faults-none" aria-label="No subsystem faults">—</span>;
  }
  return (
    <span className="faults-cell" aria-label={`Faulting subsystems: ${faulting.map((f) => f.label).join(", ")}`}>
      {faulting.map((f) => (
        <span
          key={f.key}
          className="fault-pip"
          title={`${f.label} fault — see Root Cause`}
          aria-label={`${f.label} fault`}
        >
          {SysIcon[f.icon]}
          <span className="fault-pip-label">{f.label}</span>
        </span>
      ))}
    </span>
  );
}

export default function UnitsView({ units }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // URL is the source of truth for every filter except the search input,
  // which stays local for snappy typing and syncs to URL on a debounce.
  const fleetFilter: FleetFilter = isFleetFilter(params.get("type")) ? (params.get("type") as FleetFilter) : "All Types";
  const statusParam = params.get("status");
  const statusFilter: "all" | "ready" | "not-ready" =
    statusParam === "ready" ? "ready" : statusParam === "not-ready" ? "not-ready" : "all";
  const topIssueFilter = params.get("issue");
  const faultFilter: FaultFilter = isFaultFilter(params.get("fault")) ? (params.get("fault") as FaultFilter) : "all";
  const sortKey: keyof Unit = isSortKey(params.get("sort")) ? (params.get("sort") as keyof Unit) : "id";
  const sortDir: "asc" | "desc" = params.get("dir") === "desc" ? "desc" : "asc";

  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== search) setParams({ q: search || null });
    }, 250);
    return () => clearTimeout(t);
  }, [search, params, setParams]);

  const filtered = useMemo(() => {
    return units
      .filter((u) => {
        if (fleetFilter !== "All Types" && u.type !== fleetFilter) return false;
        if (search && !u.id.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter === "ready" && u.status !== "READY") return false;
        if (statusFilter === "not-ready" && u.status !== "NOT READY") return false;
        if (faultFilter !== "all" && u[faultFilter] !== "NOT OK") return false;
        if (topIssueFilter && !u.rootCauses.includes(topIssueFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        const av = a[sortKey] as string;
        const bv = b[sortKey] as string;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [units, fleetFilter, search, statusFilter, faultFilter, topIssueFilter, sortKey, sortDir]);

  // Infinite-scroll: render PAGE_SIZE rows at first, grow by PAGE_SIZE
  // when the bottom sentinel enters the scroll viewport. Reset on
  // any filter/sort change so users always start from the top.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [fleetFilter, search, statusFilter, faultFilter, topIssueFilter, sortKey, sortDir]);

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= filtered.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { root: el.closest(".table-wrap"), rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, filtered.length]);

  const visible = filtered.slice(0, visibleCount);
  const TOTAL_COLS = 7;

  // ---- Filter helpers used by both the empty-state recovery block and
  // the keyboard reset shortcut. ----
  const resetAll = useCallback(() => {
    setSearch("");
    setParams({ q: null, type: null, status: null, fault: null, issue: null, sort: null, dir: null });
  }, [setParams]);

  const clearFilter = useCallback(
    (key: "type" | "status" | "fault" | "issue" | "q") => {
      if (key === "q") setSearch("");
      setParams({ [key]: null });
    },
    [setParams],
  );

  // ---- Row keyboard navigation ----
  const goTo = useCallback((href: Route) => router.push(href), [router]);
  const onRowKey = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, href: Route) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTo(href);
      }
    },
    [goTo],
  );

  // ---- Global power-user shortcuts ----
  // `/` focuses search, `Esc` clears search/blurs, `r` resets all filters,
  // `1`/`2`/`3` switches the status segmented control, `j`/`k` plus arrow
  // up/down move row focus through visible rows. `Enter` from a focused
  // row opens the unit. None of these fire while the user is typing in an
  // input or contenteditable element so we never steal a keystroke.
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const focusedRowIndex = (): number => {
      const tbody = tableBodyRef.current;
      if (!tbody) return -1;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return -1;
      const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr.unit-row"));
      return rows.indexOf(active as HTMLTableRowElement);
    };

    const focusRowAt = (idx: number) => {
      const tbody = tableBodyRef.current;
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr.unit-row"));
      if (rows.length === 0) return;
      const clamped = Math.max(0, Math.min(rows.length - 1, idx));
      rows[clamped]?.focus();
    };

    const handler = (e: KeyboardEvent) => {
      // Esc is allowed even while typing — it clears search.
      if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          if (search) {
            setSearch("");
          } else {
            searchInputRef.current?.blur();
          }
          return;
        }
        return;
      }

      if (isTyping(e.target)) return;
      // Ignore modified shortcuts so we never collide with browser-level keys.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // `/` focuses the search input.
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetAll();
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        setParams({ status: null });
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        setParams({ status: "ready" });
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        setParams({ status: "not-ready" });
        return;
      }

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const idx = focusedRowIndex();
        focusRowAt(idx < 0 ? 0 : idx + 1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const idx = focusedRowIndex();
        focusRowAt(idx < 0 ? 0 : idx - 1);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [search, setParams, resetAll]);

  const ariaSortFor = (key: keyof Unit): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const sortHeader = (key: keyof Unit, label: string) => (
    <th
      onClick={() =>
        setParams({
          sort: String(key),
          dir: sortKey === key && sortDir === "asc" ? "desc" : "asc",
        })
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setParams({
            sort: String(key),
            dir: sortKey === key && sortDir === "asc" ? "desc" : "asc",
          });
        }
      }}
      className={`sortable ${sortKey === key ? "active" : ""}`}
      tabIndex={0}
      aria-sort={ariaSortFor(key)}
    >
      <div className="th-inner">
        {label}
        <span className="sort-ico" aria-hidden="true">
          {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </div>
    </th>
  );

  // Active-filter chips for the rich empty state: every narrowing the user
  // imposed gets a removable chip so the user can roll back one filter at a
  // time without losing the others.
  const activeFilters: Array<{ key: "type" | "status" | "fault" | "issue" | "q"; label: string; value: string }> = [];
  if (fleetFilter !== "All Types") activeFilters.push({ key: "type", label: "Type", value: fleetFilter });
  if (statusFilter !== "all")
    activeFilters.push({ key: "status", label: "Status", value: statusFilter === "ready" ? "READY" : "NOT READY" });
  if (faultFilter !== "all") {
    const label = FAULT_DEVICES.find((device) => device.key === faultFilter)?.label ?? faultFilter;
    activeFilters.push({ key: "fault", label: "Fault", value: label });
  }
  if (topIssueFilter) activeFilters.push({ key: "issue", label: "Issue", value: topIssueFilter });
  if (search) activeFilters.push({ key: "q", label: "Search", value: `"${search}"` });

  return (
    <main className="overview units-view">
      <Card
        title="UNIT STATUS"
        subtitle={`${visible.length} of ${filtered.length} shown · ${units.length} total`}
        actions={
          <div className="unit-actions">
            <div className="search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={searchInputRef}
                placeholder="Search unit"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search by unit"
              />
              {search ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              ) : (
                <kbd className="search-kbd" aria-hidden="true">/</kbd>
              )}
            </div>
            <div className="table-fleet-filter">
              <select
                value={fleetFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setParams({ type: isFleetFilter(v) && v !== "All Types" ? v : null });
                }}
                aria-label="Filter by fleet type"
              >
                {FLEET_TYPES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <svg className="caret" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M3 5l3 3 3-3" />
              </svg>
            </div>
            <div className="segmented" role="group" aria-label="Filter by status">
              {([
                ["all", "All"],
                ["ready", "Ready"],
                ["not-ready", "Not Ready"],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className={`tab ${statusFilter === k ? "active" : ""}`}
                  onClick={() => setParams({ status: k === "all" ? null : k })}
                  aria-pressed={statusFilter === k}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="segmented fault-filter" role="group" aria-label="Quick filter by fault">
              {([
                ["all", "All Faults"],
                ...FAULT_DEVICES.map((device) => [device.key, device.filterLabel ?? device.label] as const),
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className={`tab ${faultFilter === k ? "active" : ""}`}
                  onClick={() => setParams({ fault: k === "all" ? null : k })}
                  aria-pressed={faultFilter === k}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="reset-filters-btn"
              onClick={resetAll}
              title="Reset all filters (R)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        }
      >
        <div className="table-wrap">
          <div className="units-sr-live" role="status" aria-live="polite">
            {filtered.length === 0
              ? "No units match the current filters"
              : `${filtered.length} of ${units.length} units match`}
          </div>
          <table className="unit-table units-table">
            <thead>
              <tr>
                {sortHeader("id", "Unit")}
                <th>Connection</th>
                {sortHeader("type", "Type")}
                <th>Faults</th>
                {sortHeader("status", "Status")}
                <th>Root Cause</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={TOTAL_COLS} className="empty-state-cell">
                    <div className="empty-state-block" role="status">
                      <div className="empty-state-title">No units match.</div>
                      {activeFilters.length > 0 ? (
                        <>
                          <div className="empty-state-sub">
                            {activeFilters.length === 1 ? "1 filter active" : `${activeFilters.length} filters active`}
                          </div>
                          <div className="empty-state-chips">
                            {activeFilters.map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                className="filter-chip"
                                onClick={() => clearFilter(f.key)}
                                aria-label={`Remove ${f.label} filter`}
                                title={`Remove ${f.label} filter`}
                              >
                                <span className="filter-chip-label">{f.label}:</span>
                                <span className="filter-chip-value">{f.value}</span>
                                <span className="filter-chip-x" aria-hidden="true">×</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              className="filter-chip filter-chip-clear-all"
                              onClick={resetAll}
                            >
                              Clear all
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="empty-state-sub">No filters active.</div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {visible.map((u) => {
                const href = `/unit/${encodeURIComponent(u.id)}` as Route;
                return (
                  <tr
                    key={u.id}
                    onClick={() => goTo(href)}
                    onKeyDown={(e) => onRowKey(e, href)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open unit ${u.id} detail`}
                    className={`unit-row ${u.status === "NOT READY" ? "not-ready" : ""}`}
                  >
                    <td className="unit-id">
                      <Link href={href} className="unit-id-link" onClick={(e) => e.stopPropagation()}>
                        {u.id}
                      </Link>
                    </td>
                    <td><ConnPill online={u.online} /></td>
                    <td className="muted">{u.type}</td>
                    <td><FaultsCell unit={u} /></td>
                    <td><StatusChip status={u.status} size="sm" /></td>
                    <td className={u.rootCauses.length ? "rc bad" : "rc muted"}>{u.rootCauseLabel}</td>
                    <td className="muted">{u.lastUpdate}</td>
                  </tr>
                );
              })}
              {visibleCount < filtered.length && (
                <tr ref={sentinelRef} className="row-sentinel" aria-hidden="true">
                  <td colSpan={TOTAL_COLS}>
                    <div className="row-sentinel-bar" />
                  </td>
                </tr>
              )}
              {visibleCount >= filtered.length && filtered.length > 0 && (
                <tr className="row-end">
                  <td colSpan={TOTAL_COLS} className="row-end-cell muted">
                    End of list · {filtered.length} {filtered.length === 1 ? "unit" : "units"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
