// Pure presentational atoms — server-renderable. The one interactive widget
// (DonutBreakdown) lives in its own client file so this module can stay RSC.
import React from "react";
import type { DeviceStatus, UnitStatus } from "@/lib/data";

type ChipStatus = DeviceStatus | UnitStatus;

export function StatusChip({ status, size = "md" }: { status: ChipStatus; size?: "sm" | "md" | "lg" }) {
  const map: Record<string, { dot: string; label: string; cls: string }> = {
    OK: { dot: "var(--ok)", label: "OK", cls: "ok" },
    "NOT OK": { dot: "var(--bad)", label: "NOT OK", cls: "bad" },
    READY: { dot: "var(--ok)", label: "READY", cls: "ok" },
    "NOT READY": { dot: "var(--bad)", label: "NOT READY", cls: "bad" },
  };
  const cfg = map[status] || map.OK;
  return (
    <span className={`chip chip-${cfg.cls} chip-${size}`}>
      <span className="chip-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function ConnPill({ online }: { online: boolean }) {
  return (
    <span
      className={`conn-pill ${online ? "on" : "off"}`}
      title={online ? "Online — reporting telemetry" : "Offline — no telemetry in last 15 min"}
    >
      <span className="conn-dot" />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function MiniStatus({ s }: { s: DeviceStatus }) {
  const map = { OK: "ok", "NOT OK": "bad" } as const;
  const tip = { OK: "Operating normally", "NOT OK": "Fault — unit not ready" }[s];
  return (
    <span className={`mini-status mini-${map[s]}`} title={tip}>
      {s === "OK" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3.5 6l2 2 3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
      <span className="mini-label">{s}</span>
    </span>
  );
}

export function RingGauge({
  size = 140,
  strokeWidth = 14,
  segments,
  centerLabel,
  centerValue,
  sublabel,
}: {
  size?: number;
  strokeWidth?: number;
  segments: { value: number; color: string }[];
  centerLabel?: string;
  centerValue: React.ReactNode;
  sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <div className="ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className="ring-center">
        {centerLabel && <div className="ring-label">{centerLabel}</div>}
        <div className="ring-value">{centerValue}</div>
        {sublabel && <div className="ring-sub">{sublabel}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  wide,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${wide ? "wide" : ""} ${className || ""}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export const SysIcon = {
  fuel: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="11" height="18" rx="1" />
      <path d="M14 8h2.5a2 2 0 012 2v7a2 2 0 002 2v0a2 2 0 002-2V8.5L19 5" />
      <path d="M3 10h11" />
    </svg>
  ),
  lube: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l5 8a5 5 0 11-10 0z" />
    </svg>
  ),
  fire: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c2 4 5 5 5 9a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-5 1-8z" />
    </svg>
  ),
  gps: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  logger: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h7" />
      <circle cx="17.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l10 17H2z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r=".5" fill="currentColor" />
    </svg>
  ),
  excavator: (
    <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M8 32h44a4 4 0 004-4v-4H4v4a4 4 0 004 4z" />
      <rect x="14" y="14" width="20" height="10" rx="1" />
      <path d="M28 14l16-9 8 4-4 8" />
      <path d="M48 17l-4 8M44 25l8 5-3 4-9-4" />
      <circle cx="14" cy="32" r="3" />
      <circle cx="48" cy="32" r="3" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M4 28V14h22v14" />
      <path d="M26 18h12l8 8v2H4" />
      <circle cx="14" cy="32" r="3" />
      <circle cx="42" cy="32" r="3" />
    </svg>
  ),
};
