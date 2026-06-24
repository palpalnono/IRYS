import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Route } from "next";
import { getFleetUnit, getUnitHistory } from "@/lib/data";
import type { DeviceStatus } from "@/lib/data";
import { getCasSnapshot } from "@/lib/cas-data";
import type { CasAlarm } from "@/lib/cas-data";
import { resolveFleetDateTimeRange } from "@/lib/date-range";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import DateRangeControl from "@/components/DateRangeControl";
import { Card, StatusChip, MiniStatus } from "@/components/atoms";
import DebugDump from "@/components/DebugDump";

// Define the system names we support
const SYSTEMS = ["fuel", "lube", "fire", "gps", "cas", "device"] as const;
type SystemType = typeof SYSTEMS[number];

function isSystemType(s: string): s is SystemType {
  return SYSTEMS.includes(s as SystemType);
}

// Map system type to meta info
const SYSTEM_META: Record<SystemType, { title: string; subtitle: string }> = {
  fuel: { title: "Fuel System History", subtitle: "FLOMEC" },
  lube: { title: "Lube System History", subtitle: "G2 TIMER" },
  fire: { title: "Fire System History", subtitle: "ANSUL" },
  gps: { title: "GPS Telemetry History", subtitle: "LOGGER" },
  cas: { title: "CAS Safety Camera Alarms", subtitle: "STONKAM" },
  device: { title: "Device Telemetry History", subtitle: "IRYS LGR-200" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; system: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const unitId = decodeURIComponent(resolvedParams.id);
  const sys = resolvedParams.system.toLowerCase();
  
  if (!isSystemType(sys)) notFound();
  
  const unit = await getFleetUnit(unitId);
  if (!unit) notFound();
  
  const meta = SYSTEM_META[sys];
  return { title: `${unit.id} · ${meta.title}` };
}

// Helper to format ISO timestamps cleanly
function formatTimestamp(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const t = new Date(isoString);
    if (!Number.isFinite(t.getTime())) return isoString;
    
    return new Intl.DateTimeFormat("en-US", {
      timeZone: process.env.INTECS_TIME_ZONE ?? "Asia/Jakarta",
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(t).replace(", ", " ");
  } catch {
    return isoString;
  }
}

export default async function UnitSystemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; system: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const unitId = decodeURIComponent(resolvedParams.id);
  const sys = resolvedParams.system.toLowerCase();

  if (!isSystemType(sys)) notFound();

  const unit = await getFleetUnit(unitId);
  if (!unit) notFound();

  const meta = SYSTEM_META[sys];
  const dateRange = resolveFleetDateTimeRange(resolvedSearchParams);
  
  // Load telemetry data from API or mock
  const apiHistory = await getUnitHistory(unitId, { dateRange });

  // Enforce strict local datetime filtering. 
  // The API may only filter by day boundaries; this ensures precise hour/minute filtering.
  const startMs = new Date(dateRange.dateStart).getTime();
  const endMs = new Date(dateRange.dateEnd).getTime();
  
  const getEventDate = (r: Record<string, unknown>): string | undefined => {
    const events = r.events as Record<string, unknown> | undefined;
    return typeof events?.eventDate === "string" ? events.eventDate : undefined;
  };

  const filterAndSort = <T extends { createdAt?: string }>(records: T[] | undefined): T[] => {
    return (records ?? [])
      .filter((r) => {
        const timeStr = getEventDate(r as Record<string, unknown>) || r.createdAt;
        if (!timeStr) return false;
        const t = new Date(timeStr).getTime();
        return t >= startMs && t <= endMs;
      })
      .sort((a, b) => {
        const timeA = Date.parse(getEventDate(a as Record<string, unknown>) || a.createdAt || "") || 0;
        const timeB = Date.parse(getEventDate(b as Record<string, unknown>) || b.createdAt || "") || 0;
        return timeB - timeA; // Descending (newest first)
      });
  };

  apiHistory.fuelData = filterAndSort(apiHistory.fuelData);
  apiHistory.autolubeData = filterAndSort(apiHistory.autolubeData);
  apiHistory.ansulData = filterAndSort(apiHistory.ansulData);

  // Load CAS snapshot if looking at CAS
  let casAlarms: CasAlarm[] = [];
  if (sys === "cas") {
    const casSnapshot = await getCasSnapshot();
    // Filter alarms matching this unit
    casAlarms = casSnapshot.alarms.filter(
      (alarm) => alarm.plateNumber.toLowerCase() === unitId.toLowerCase()
    );
  }

  return (
    <div className="app density-comfortable" data-screen-label={`${meta.title}`}>
      <DebugDump sys={sys} data={
        sys === "fire" ? apiHistory.ansulData : 
        sys === "lube" ? apiHistory.autolubeData : 
        (sys === "fuel" || sys === "gps") ? apiHistory.fuelData : 
        sys === "cas" ? casAlarms :
        apiHistory
      } />
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={formatTimestamp(new Date().toISOString())} />
      
      <main className="overview fuel-view lube-view fire-view gps-view device-view">
        <div className="fuel-head">
          <BackButton fallback={`/unit/${encodeURIComponent(unitId)}` as Route} label="Back to Unit" />
          <div className="fuel-title-row">
            <div>
              <div className="screen-title">{unitId} · {meta.title}</div>
              <div className="screen-sub">{meta.subtitle}</div>
            </div>
          </div>
        </div>

        <div className="detail-toolbar" style={{ margin: "14px 0" }}>
          <DateRangeControl range={dateRange} precision="datetime" />
        </div>

        <Card title="HISTORICAL LOGS" subtitle={`${dateRange.label}`}>
          <div className="table-wrap">
            {sys === "fuel" && (
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Flowrate</th>
                    <th>Flow A</th>
                    <th>Flow B</th>
                    <th>Temp A</th>
                    <th>Temp B</th>
                    <th>GPS Fix</th>
                    <th>Error Code</th>
                  </tr>
                </thead>
                <tbody>
                  {(!apiHistory.fuelData || apiHistory.fuelData.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="empty-row">No fuel records found for this range</td>
                    </tr>
                  ) : (
                    apiHistory.fuelData.map((record, index) => (
                      <tr key={record.id || index} className="unit-row">
                        <td className="unit-id">{formatTimestamp(record.createdAt)}</td>
                        <td className="tabular-nums">{record.flowrate_differential?.datavalue ?? 0} L/min</td>
                        <td className="tabular-nums">{record.flowrate_a?.datavalue ?? 0} L/min</td>
                        <td className="tabular-nums">{record.flowrate_b?.datavalue ?? 0} L/min</td>
                        <td className="tabular-nums">{record.temperature_a?.datavalue ?? 0} °C</td>
                        <td className="tabular-nums">{record.temperature_b?.datavalue ?? 0} °C</td>
                        <td>{record.status_gps || "—"}</td>
                        <td>
                          {record.error_code?.datavalue ? (
                            <span className="delta-bad">Code {record.error_code.datavalue}</span>
                          ) : (
                            <span className="delta-ok">OK</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {sys === "lube" && (
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredData = apiHistory.autolubeData || [];
                    if (filteredData.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} className="empty-row">No lube records found for this range</td>
                        </tr>
                      );
                    }
                    return filteredData.map((record, index) => {
                      const isFaultLampOn = record.events?.faultLamp;
                      return (
                        <tr key={record.id || index} className="unit-row">
                          <td className="unit-id">{formatTimestamp(record.createdAt)}</td>
                          <td>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {isFaultLampOn ? (
                                <span key="fl" className="delta-bad">Fault Lamp</span>
                              ) : (
                                <span key="fl-off" className="delta-ok">Fault Lamp Off</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            )}

            {sys === "fire" && (
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event ID</th>
                    <th>Event Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!apiHistory.ansulData || apiHistory.ansulData.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="empty-row">No fire suppression records found for this range</td>
                    </tr>
                  ) : (
                    apiHistory.ansulData.map((record, index) => {
                      const eventDesc = record.events?.eventDesc?.toLowerCase() ?? "";
                      const hasAnsulFault = !/normal|ok|clear|test/.test(eventDesc);
                      return (
                        <tr key={record.id || index} className="unit-row">
                          <td className="unit-id">{formatTimestamp(record.events?.eventDate || record.createdAt)}</td>
                          <td className="tabular-nums">{record.events?.eventId || "—"}</td>
                          <td>{record.events?.eventDesc || "—"}</td>
                          <td>
                            <StatusChip status={hasAnsulFault ? "NOT OK" : "OK"} size="sm" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {sys === "gps" && (
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Speed</th>
                    <th>Fix Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!apiHistory.fuelData || apiHistory.fuelData.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="empty-row">No GPS logs found for this range</td>
                    </tr>
                  ) : (
                    apiHistory.fuelData.map((record, index) => (
                      <tr key={record.id || index} className="unit-row">
                        <td className="unit-id">{formatTimestamp(record.createdAt)}</td>
                        <td className="tabular-nums">{record.lat?.toFixed(6) ?? "0.000000"}</td>
                        <td className="tabular-nums">{record.lon?.toFixed(6) ?? "0.000000"}</td>
                        <td className="tabular-nums">{record.speed ?? 0} km/h</td>
                        <td>{record.status_gps || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {sys === "cas" && (
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event ID</th>
                    <th>Alarm Type</th>
                    <th>Alarm Label</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {casAlarms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-row">No CAS safety camera alarms logged</td>
                    </tr>
                  ) : (
                    casAlarms.map((alarm) => (
                      <tr key={alarm.eventId} className="unit-row">
                        <td className="unit-id">{alarm.time}</td>
                        <td className="tabular-nums">{alarm.eventId}</td>
                        <td className="tabular-nums">{alarm.alarmType}</td>
                        <td>{alarm.label}</td>
                        <td>
                          {alarm.videoId ? (
                            <span className="delta-bad">Video ID: {alarm.videoId}</span>
                          ) : (
                            <span className="muted">No video</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
