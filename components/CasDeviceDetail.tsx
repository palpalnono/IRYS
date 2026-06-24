import Link from "next/link";
import type { ReactNode } from "react";
import type { CasAlarm, CasDevice, CasReadiness, CasSnapshot } from "@/lib/cas-data";
import { getCasEvidenceLabel, getCasReadiness } from "@/lib/cas-utils";
import { Card, SysIcon } from "@/components/atoms";
import BackButton from "@/components/BackButton";
import SystemNav from "@/components/SystemNav";

function DetailKV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="cas-detail-kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AlarmRow({ alarm, evidence }: { alarm: CasAlarm; evidence: string }) {
  return (
    <div className="cas-detail-alarm-row">
      <div>
        <div className="cas-event-name">{alarm.label}</div>
        <div className="cas-event-time">{alarm.time}</div>
      </div>
      <div className="cas-detail-alarm-meta">
        <span className="cas-evidence">{evidence}</span>
      </div>
    </div>
  );
}

function CasReadinessPill({ status }: { status: CasReadiness }) {
  return (
    <span className={`cas-readiness-pill ${status === "Ready" ? "ok" : "bad"}`}>
      <span className="chip-dot" />
      {status}
    </span>
  );
}

export default function CasDeviceDetail({
  device,
  snapshot,
}: {
  device: CasDevice;
  snapshot: CasSnapshot;
}) {
  const alarms = snapshot.alarms.filter((alarm) => alarm.deviceId === device.deviceId);
  const readiness = getCasReadiness(device, snapshot.alarms);

  return (
    <main className="overview fuel-view cas-view cas-detail-view">
      <div className="fuel-head">
        <BackButton />
        <div className="fuel-title-row">
          <span className="sys-icon-inline">{SysIcon.logger}</span>
          <div>
            <div className="screen-title">{device.plateNumber}</div>
            <div className="screen-sub">Last seen {device.gpsTime}</div>
          </div>
        </div>
      </div>

      <SystemNav active="cas" />

      <section className="cas-detail-hero" aria-label={`${device.plateNumber} CAS detail`}>
        <div className="cas-detail-identity">
          <div className="system-hero-eyebrow">DEVICE</div>
          <div className="cas-detail-unit">{device.plateNumber}</div>
          <div className="cas-detail-subline">Camera safety</div>
        </div>
        <div className="cas-detail-status">
          <CasReadinessPill status={readiness} />
          <span className={readiness === "Fault" ? "cas-detail-active-alarm" : "cas-detail-clear"}>
            {alarms.length} active alarm{alarms.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <section className="cas-detail-grid">
        <Card title="TELEMETRY" subtitle="Latest reading">
          <div className="cas-detail-kv-list">
            <DetailKV label="Speed" value={`${device.speed} km/h`} />
            <DetailKV label="CAS Status" value={<CasReadinessPill status={readiness} />} />
            <DetailKV label="Last seen" value={device.gpsTime || "Offline"} />
            <DetailKV label="Lon" value={device.lon} />
            <DetailKV label="Lat" value={device.lat} />
            <DetailKV label="Record Files" value={device.recordFileCount} />
          </div>
        </Card>

      </section>

      <Card title="ALARM HISTORY" subtitle={`${alarms.length} events`} className="wide">
        {alarms.length ? (
          <div className="cas-detail-alarm-list">
            {alarms.map((alarm) => (
              <AlarmRow
                key={alarm.eventId}
                alarm={alarm}
                evidence={getCasEvidenceLabel(alarm, snapshot.devices)}
              />
            ))}
          </div>
        ) : (
          <div className="cas-detail-empty">No CAS alarms recorded for this device.</div>
        )}
      </Card>

      <Link href="/system/cas" className="cas-detail-back-link">
        Back to CAS field
      </Link>
    </main>
  );
}
