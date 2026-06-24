"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { CasReadiness, CasSnapshot } from "@/lib/cas-data";
import { getCasEvidenceLabel, getCasReadiness } from "@/lib/cas-utils";
import { Card, SysIcon } from "@/components/atoms";
import BackButton from "@/components/BackButton";
import SystemNav from "@/components/SystemNav";

function SummaryStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className={`cas-summary-stat ${tone ? `tone-${tone}` : ""}`}>
      <div className="cas-summary-value">{value}</div>
      <div className="cas-summary-label">{label}</div>
    </div>
  );
}

function Bars({ items, max }: { items: { label: string; count: number }[]; max?: number }) {
  const ceiling = max ?? Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="cas-bars">
      {items.map((item) => (
        <div key={item.label} className="cas-bar-row">
          <div className="cas-bar-label">{item.label}</div>
          <div className="cas-bar-track">
            <span style={{ width: `${Math.max(2, (item.count / ceiling) * 100)}%` }} />
          </div>
          <div className="cas-bar-value">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

function alarmName(label: string) {
  return label.replace(/^\d+\s*-\s*/, "");
}

function CasReadinessPill({ status }: { status: CasReadiness }) {
  return (
    <span className={`cas-readiness-pill ${status === "Ready" ? "ok" : "bad"}`}>
      <span className="chip-dot" />
      {status}
    </span>
  );
}

export default function CasView({ snapshot }: { snapshot: CasSnapshot }) {
  const [showOnlyActiveAlarms, setShowOnlyActiveAlarms] = useState(false);
  const { stats } = snapshot;
  const alarmDeviceIds = useMemo(
    () => new Set(snapshot.alarms.map((alarm) => alarm.deviceId)),
    [snapshot.alarms]
  );
  const alarmCounts = snapshot.alarmTypeCounts.map((item) => ({
    ...item,
    label: alarmName(item.label),
  }));
  const displayedDevices = showOnlyActiveAlarms
    ? snapshot.devices.filter((device) => alarmDeviceIds.has(device.deviceId))
    : snapshot.devices;

  return (
    <main className="overview fuel-view cas-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.logger}</span>
          <div>
            <div className="screen-title">CAS</div>
            <div className="screen-sub">{snapshot.devices.length} units · Updated {snapshot.lastUpdate}</div>
          </div>
        </div>
      </div>

      <SystemNav active="cas" />

      <section className="system-hero cas-hero cas-hero-summary-only" aria-label="CAS summary">
        <div className="system-hero-field">
          <div className="system-hero-field-title">
            <div className="system-hero-eyebrow">ALARM SUMMARY</div>
            <div className="system-hero-field-hint">{snapshot.alarms.length} events</div>
          </div>
          <div className="cas-summary-grid" aria-label="CAS summary">
            <SummaryStat label="Units" value={stats.totalDevices} />
            <SummaryStat label="Active Alarms" value={stats.activeAlarms} tone={stats.activeAlarms > 0 ? "bad" : "ok"} />
            <SummaryStat label="Units With Alarms" value={stats.unitsWithAlarms} tone={stats.unitsWithAlarms > 0 ? "bad" : "ok"} />
            <SummaryStat label="Offline CAS Units" value={stats.offlineDevices} tone={stats.offlineDevices > 0 ? "bad" : "ok"} />
          </div>
        </div>
      </section>

      <section className="cas-analysis-grid" aria-label="CAS alarm analysis">
        <Card title="ALARMS" subtitle={`${snapshot.alarms.length} events`} className="cas-alarms-card">
          <Bars items={alarmCounts} />
        </Card>

        <Card title="ALARM HISTORY" subtitle={`${snapshot.alarms.length} events`} className="cas-history-card">
          <div className="table-wrap cas-table-wrap">
            <table className="unit-table cas-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Alarm</th>
                  <th>Evidence</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.alarms.map((alarm) => (
                  <tr key={alarm.eventId} className="unit-row">
                    <td className="unit-id">{alarm.plateNumber}</td>
                    <td>{alarm.label}</td>
                    <td><span className="cas-evidence">{getCasEvidenceLabel(alarm, snapshot.devices)}</span></td>
                    <td>{alarm.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <Card
        title="LIVE STATE"
        subtitle={`${displayedDevices.length} of ${snapshot.devices.length} units`}
        actions={
          <label className={`toggle-pill ${showOnlyActiveAlarms ? "is-active" : ""}`}>
            <input
              type="checkbox"
              checked={showOnlyActiveAlarms}
              onChange={(event) => setShowOnlyActiveAlarms(event.target.checked)}
            />
            <span>{showOnlyActiveAlarms ? "Filtered: active alarms" : "Active Alarm"}</span>
          </label>
        }
      >
        <div className="table-wrap cas-table-wrap">
          <table className="unit-table cas-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Status</th>
                <th>Speed</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {displayedDevices.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-row">No units match filter</td>
                </tr>
              )}
              {displayedDevices.map((device) => {
                const readiness = getCasReadiness(device, snapshot.alarms);
                return (
                  <tr key={device.deviceId} className="unit-row">
                    <td className="unit-id">{device.plateNumber}</td>
                    <td><CasReadinessPill status={readiness} /></td>
                    <td className="tabular-nums">{device.speed} km/h</td>
                    <td>{device.gpsTime || "Offline"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="UNITS" subtitle={`${snapshot.devices.length} connected`}>
        <div className="cas-device-field" role="list" aria-label="CAS unit list">
          {snapshot.devices.map((device) => {
            const readiness = getCasReadiness(device, snapshot.alarms);
            const alarmCount = snapshot.alarms.filter((alarm) => alarm.deviceId === device.deviceId).length;

            return (
              <Link
                key={device.deviceId}
                href={`/system/cas/${device.deviceId}`}
                className={`cas-device-cell ${readiness === "Ready" ? "online" : "offline"}`}
                role="listitem"
              >
                <div className="cas-device-cell-head">
                  <span className="cas-device-unit">{device.plateNumber}</span>
                  <CasReadinessPill status={readiness} />
                </div>
                <div className="cas-device-meta">
                  <span>{device.gpsTime || "Offline"}</span>
                </div>
                {readiness === "Fault" ? (
                  <div className="cas-device-alarm">{alarmCount} active alarm{alarmCount === 1 ? "" : "s"}</div>
                ) : (
                  <div className="cas-device-clear">Ready · {device.speed} km/h</div>
                )}
                <span className="cas-device-open">Open details</span>
              </Link>
            );
          })}
        </div>
      </Card>

    </main>
  );
}
