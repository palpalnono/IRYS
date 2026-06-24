// Server component — entirely static markup.
import Link from "next/link";
import type { DeviceStatus, Unit, UnitTelemetry } from "@/lib/data";
import type { CasDevice, CasSnapshot } from "@/lib/cas-data";
import type { FleetDateRange } from "@/lib/date-range";
import { Card, ConnPill, StatusChip, SysIcon } from "./atoms";
import BackButton from "./BackButton";
import DateRangeControl from "./DateRangeControl";

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{value}</span>
    </div>
  );
}

function findCasDevice(unit: Unit, snapshot: CasSnapshot): CasDevice | undefined {
  const id = unit.id.toLowerCase();
  return snapshot.devices.find((device) =>
    device.plateNumber.toLowerCase() === id
  );
}

// Cycle-state badge for the LUBE card. Pulses green when the timer is
// running, dimmed/static when paused. Single-instance state, so we
// don't fake a duty-cycle ratio — we just visualize the live state.
// When the IRYS logger is offline, the cycle state is unknown — render
// a neutral grey circle with "NO DATA" instead of guessing RUN or PAUSE.
function LubeStateBadge({ state, faults, online }: { state: "RUN" | "PAUSE"; faults: number; online: boolean }) {
  if (!online) {
    return (
      <div className="lube-badge">
        <div className="lube-circle nodata">
          <div className="lube-state">—</div>
          <div className="lube-state-sub">NO DATA</div>
        </div>
        <div className="lube-faults nodata">NO DATA</div>
      </div>
    );
  }
  const running = state === "RUN";
  return (
    <div className="lube-badge">
      <div className={`lube-circle ${running ? "running" : "paused"}`}>
        <div className="lube-state">{state}</div>
        <div className="lube-state-sub">{running ? "in cycle" : "between cycles"}</div>
      </div>
      <div className={`lube-faults ${faults > 0 ? "bad" : "ok"}`}>
        {faults > 0 ? `${faults} fault${faults > 1 ? "s" : ""}` : "No faults"}
      </div>
    </div>
  );
}

// Fire suppression panel — ANSUL categories surface the highlighted
// CHECKFIRE 210-D event-history messages for active/fault states. Normal
// states display OK.
//
// When the IRYS logger is offline, no telemetry reaches the platform, so every
// tile reads neutral "NO DATA" — never green (false reassurance), never red
// (false alarm).
//
// NOTE: message strings are transcribed from a low-resolution scan of Table
// 5-7 — verify the exact wording against the manual and edit here if needed.
function FirePanel({ fire, online }: { fire: UnitTelemetry["fire"]; online: boolean }) {
  const { detection1, detection, discharge, power, releaseValve, isolate, engineShutdown } = fire;

  const items: { label: string; msg: string; tone: "ok" | "bad" }[] = [
    {
      label: "Detection #1",
      msg: detection1 === "TRIGGERED" ? "Detection Input #1 Initiated" : "OK",
      tone: detection1 === "TRIGGERED" ? "bad" : "ok",
    },
    {
      label: "Detection #2",
      msg: detection === "TRIGGERED" ? "Detection Input #2 Initiated" : "OK",
      tone: detection === "TRIGGERED" ? "bad" : "ok",
    },
    {
      label: "Release",
      msg: releaseValve === "OPEN" ? "Release Circuit Activated" : "OK",
      tone: releaseValve === "OPEN" ? "bad" : "ok",
    },
    {
      label: "Engine Shutdown",
      msg: engineShutdown === "ACTIVE" ? "Shutdown Relay Activated" : "OK",
      tone: engineShutdown === "ACTIVE" ? "bad" : "ok",
    },
    {
      label: "Discharge",
      msg: discharge === "YES" ? "Discharge Confirmed by Pressure Switch" : "OK",
      tone: discharge === "YES" ? "bad" : "ok",
    },
    {
      label: "Power",
      msg: power === "LOST" ? "Primary Power Fault" : "OK",
      tone: power === "LOST" ? "bad" : "ok",
    },
    {
      label: "Isolate",
      msg: isolate === "ENABLED" ? "Isolate Mode Activated" : "OK",
      tone: isolate === "ENABLED" ? "bad" : "ok",
    },
  ];

  return (
    <div className="fire-panel">
      {items.map((it) => {
        const cls = !online ? "nodata" : it.tone;
        const display = !online ? "NO DATA" : it.msg;
        return (
          <div key={it.label} className={`fire-ind ${cls}`}>
            <div className="fire-ind-light" aria-hidden="true" />
            <div className="fire-ind-meta">
              <div className="fire-ind-label">{it.label}</div>
              <div className="fire-ind-state">{display}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Maps a free-text root-cause string to a system slug for the "Open system"
// deep-link in the Root Cause Banner. Defaults to /system/device because the
// IRYS logger is the substrate the other four subsystems hang off of, so
// "device" is the safe fallback when the cause doesn't match a subsystem.
function primarySystem(rootCauses: string[]): "cas" | "lube" | "fire" | "gps" | "device" {
  const first = rootCauses[0]?.toLowerCase() ?? "";
  if (first.includes("fuel")) return "cas";
  if (first.includes("lube") || first.includes("grease")) return "lube";
  if (
    first.includes("fire") ||
    first.includes("ansul") ||
    first.includes("discharge") ||
    first.includes("isolation") ||
    first.includes("shutdown") ||
    first.includes("valve")
  ) {
    return "fire";
  }
  if (first.includes("gps")) return "gps";
  return "device";
}

export default function UnitDetail({
  unit,
  dateRange,
  casSnapshot,
}: {
  unit: Unit;
  dateRange: FleetDateRange;
  casSnapshot: CasSnapshot;
}) {
  const t = unit.telemetry;
  const casDevice = findCasDevice(unit, casSnapshot);
  const casAlarm = casDevice
    ? casSnapshot.alarms.find((alarm) => alarm.deviceId === casDevice.deviceId)
    : undefined;
  const casStatus: DeviceStatus = casDevice && !casAlarm ? "OK" : "NOT OK";

  // Failing-subsystem dominance — only when the logger is reporting. When the
  // logger is offline we can't honestly say which subsystem failed, so honest
  // grey wins and no card gets the dominant treatment.
  const failingClass = (s: DeviceStatus) =>
    unit.online && s === "NOT OK" ? "subsystem-card-fail dominant-fail" : "";
  // Per-card StatusChip — keep on calm cards as a confirmation signal, drop on
  // failing cards because the tonal-border + dominant treatment now carries it
  // (avoids the "five red chips" cluster the critique flagged).
  const cardChip = (s: DeviceStatus) =>
    unit.online && s === "NOT OK" ? undefined : <StatusChip status={s} size="sm" />;

  return (
    <main className="unit-detail">
      <div className="detail-head">
        <BackButton />
        <div className="detail-title-block">
          <div className="detail-id">
            {unit.id}
            <StatusChip status={unit.status} size="md" />
            <span className={`detail-freshness ${unit.online ? "" : "stale"}`}>
              {unit.online ? unit.lastUpdate : `NO TELEMETRY · ${unit.lastUpdate}`}
            </span>
          </div>
          <div className="detail-meta">
            <span>{unit.type}</span>
          </div>
        </div>
        <div className="detail-vehicle">
          {unit.type === "Excavator" ? SysIcon.excavator : SysIcon.truck}
        </div>
      </div>
      <div className="detail-toolbar">
        <DateRangeControl range={dateRange} precision="datetime" />
      </div>

      {unit.rootCauses.length > 0 && (
        <div className="root-cause-banner">
          <span className="rcb-ico">{SysIcon.alert}</span>
          <div className="rcb-body">
            <div className="rcb-label">Root Cause Identified</div>
            <div className="rcb-list">{unit.rootCauseLabel}</div>
          </div>
          <div className="rcb-actions">
            <Link href={`/alerts?unit=${encodeURIComponent(unit.id)}`} className="btn">
              View alerts
            </Link>
            <Link href={`/system/${primarySystem(unit.rootCauses)}`} className="btn">
              Open system
            </Link>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <Card
          title="FIRE SYSTEM"
          subtitle="ANSUL"
          className={failingClass(unit.fire)}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {cardChip(unit.fire)}
              <Link href={`/system/fire/${encodeURIComponent(unit.id)}`} className="btn-sm" style={{ textDecoration: "none" }}>
                History
              </Link>
            </div>
          }
        >
          <FirePanel fire={t.fire} online={unit.online} />
          <div className="kv-list">
            <KV label="Connection" value={<ConnPill online={unit.online} />} />
          </div>
        </Card>

        <Card
          title="CAS"
          subtitle="STONKAM"
          className={failingClass(casStatus)}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {cardChip(casStatus)}
              <Link href={`/system/cas/${encodeURIComponent(unit.id)}`} className="btn-sm" style={{ textDecoration: "none" }}>
                History
              </Link>
            </div>
          }
        >
          <div className="kv-list">
            <KV label="Connection" value={<ConnPill online={Boolean(casDevice)} />} />
            <KV label="Last seen" value={casDevice ? casDevice.gpsTime : <span className="val-nodata">NO DATA</span>} />
            <KV label="Speed" value={casDevice ? `${casDevice.speed} km/h` : <span className="val-nodata">NO DATA</span>} />
            <KV label="Latest alarm" value={casAlarm ? <span className="val-bad">{casAlarm.label}</span> : <span className="val-ok">No alarm</span>} />
          </div>
        </Card>

        <Card
          title="LUBE SYSTEM"
          subtitle="G2 TIMER"
          className={failingClass(unit.lube)}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {cardChip(unit.lube)}
              <Link href={`/system/lube/${encodeURIComponent(unit.id)}`} className="btn-sm" style={{ textDecoration: "none" }}>
                History
              </Link>
            </div>
          }
        >
          <div className="lube-card-row">
            <LubeStateBadge state={t.lube.state} faults={t.lube.faultCount} online={unit.online} />
            <div className="kv-list" style={{ flex: 1 }}>
              <KV label="Connection" value={<ConnPill online={unit.online} />} />
              <KV
                label="Faults (24h)"
                value={
                  unit.online ? (
                    <span className={t.lube.faultCount > 0 ? "val-bad" : "val-ok"}>
                      {t.lube.faultCount}
                    </span>
                  ) : (
                    <span className="val-nodata">NO DATA</span>
                  )
                }
              />
            </div>
          </div>
        </Card>

        <Card
          title="GPS"
          subtitle="LOGGER"
          className={failingClass(unit.gps)}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {cardChip(unit.gps)}
              <Link href={`/system/gps/${encodeURIComponent(unit.id)}`} className="btn-sm" style={{ textDecoration: "none" }}>
                History
              </Link>
            </div>
          }
        >
          <div className="gps-card-row">
            <div className="kv-list" style={{ flex: 1 }}>
              <KV label="Connection" value={<ConnPill online={unit.online} />} />
              <KV label="Latitude" value={unit.online ? t.gps.lat : <span className="val-nodata">NO DATA</span>} />
              <KV label="Longitude" value={unit.online ? t.gps.lon : <span className="val-nodata">NO DATA</span>} />
              <KV label="Speed" value={unit.online ? `${t.gps.speed} km/h` : <span className="val-nodata">NO DATA</span>} />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
