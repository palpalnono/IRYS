// IRYS fleet dataset
// `server-only` makes any client import a build error, protecting future
// secrets/DB clients from leaking into the client bundle.
import 'server-only';
import type { FleetDateRange } from './date-range';

export type UnitStatus = "READY" | "NOT READY";
export type DeviceStatus = "OK" | "NOT OK";
export type FleetType = "Excavator" | "Dump Truck" | "Wheel Loader" | "Bulldozer";

export interface UnitTelemetry {
  fuel: { rate: number; baseline: number; flowrate: number };
  lube: { state: "RUN" | "PAUSE"; faultCount: number };
  fire: {
    detection1: "NORMAL" | "TRIGGERED";
    detection: "NORMAL" | "TRIGGERED";
    discharge: "YES" | "NO";
    power: "OK" | "LOST";
    releaseValve: "CLOSED" | "OPEN";
    isolate: "DISABLED" | "ENABLED";
    engineShutdown: "READY" | "ACTIVE";
  };
  gps: { lat: string; lon: string; speed: number };
}

export interface Unit {
  id: string;
  type: FleetType;
  fire: DeviceStatus;
  fuel: DeviceStatus;
  lube: DeviceStatus;
  gps: DeviceStatus;
  online: boolean;
  status: UnitStatus;
  rootCauses: string[];
  rootCauseLabel: string;
  lastUpdate: string;
  lastSeenISO: string;
  minsAgo: number;
  telemetry: UnitTelemetry;
}

export interface Alert {
  id: string;
  unitId: string;
  message: string;
  severity: "critical";
  minsAgo: number;
  time: string;
  status: "open" | "resolved";
}

export interface Stats {
  total: number;
  ready: number;
  notReady: number;
  availability: number;
  issues: { fuel: number; lube: number; fire: number; gps: number };
  systemHealth: Record<"fuel" | "lube" | "fire" | "gps", { normal: number; fault: number }>;
}


interface IntecsReading {
  dataname?: string;
  datavalue?: number;
  dataunit?: string;
}

interface IntecsFuelRecord {
  id?: string;
  id_unit?: string;
  createdAt?: string;
  status_gps?: string;
  lon?: number;
  lat?: number;
  speed?: number;
  flowrate_differential?: IntecsReading;
  flowrate_a?: IntecsReading;
  flowrate_b?: IntecsReading;
  temperature_a?: IntecsReading;
  temperature_b?: IntecsReading;
  error_code?: IntecsReading;
}

interface IntecsAutolubeRecord {
  id?: string;
  id_unit?: string;
  createdAt?: string;
  events?: {
    pressureSwitch?: boolean;
    lowLevel?: boolean;
    faultLamp?: boolean;
  };
}

interface IntecsAnsulRecord {
  id?: string;
  id_unit?: string;
  createdAt?: string;
  events?: {
    eventId?: string;
    eventDate?: string;
    eventDesc?: string;
  };
}

interface IntecsMusterRecord {
  id?: string;
  id_unit?: string;
  createdAt?: string;
  status?: string;
}

interface IntecsUnitResponse {
  unit?: {
    id_unit?: string;
    last_lon?: number;
    last_lat?: number;
  };
  fuelData?: IntecsFuelRecord[];
  musterData?: IntecsMusterRecord[];
  autolubeData?: IntecsAutolubeRecord[];
  ansulData?: IntecsAnsulRecord[];
  nextToken?: string | null;
}

interface FleetSnapshot {
  units: Unit[];
  alerts: Alert[];
  stats: Stats;
  lastUpdate: string;
  source: "api";
  rawApiResponses: RawIntecsApiResponse[];
}

interface FleetSnapshotOptions {
  dateRange?: Pick<FleetDateRange, "dateStart" | "dateEnd">;
}

interface RawIntecsApiResponse {
  request: {
    unitId: string;
    dateStart: string;
    dateEnd: string;
    nextToken: string | null;
  };
  response: IntecsUnitResponse;
}

interface FetchedIntecsUnit {
  merged: IntecsUnitResponse;
  rawPages: RawIntecsApiResponse[];
}

const INTECS_API_BASE_URL = process.env.INTECS_PUBLIC_API_BASE_URL ?? "https://api.intecs.flowmeter.qimxmining.cloud";
const INTECS_API_LIMIT = Math.min(Math.max(Number(process.env.INTECS_PUBLIC_API_LIMIT ?? 1000), 1), 5000);
const INTECS_API_LOOKBACK_HOURS = Math.max(Number(process.env.INTECS_PUBLIC_API_LOOKBACK_HOURS ?? 24), 1);
const INTECS_API_REVALIDATE_SECONDS = Math.max(Number(process.env.INTECS_PUBLIC_API_REVALIDATE_SECONDS ?? 60), 0);

function parseConfiguredUnitIds(): string[] {
  return (process.env.INTECS_UNIT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function formatDateTime(date: Date): string {
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.INTECS_TIME_ZONE ?? "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(",", ""); // Outputs: "DD/MM/YYYY HH:MM"
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function minutesSince(iso?: string): number {
  if (!iso) return 60 * 24 * 365;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return 60 * 24 * 365;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function newestByCreatedAt<T extends { createdAt?: string }>(records: T[] | undefined): T | undefined {
  return records?.slice().sort((a, b) => (Date.parse(a.createdAt ?? "") || 0) - (Date.parse(b.createdAt ?? "") || 0)).at(-1);
}

function readingValue(reading?: IntecsReading): number | undefined {
  return typeof reading?.datavalue === "number" ? reading.datavalue : undefined;
}

function inferFleetType(unitId: string): FleetType {
  const id = unitId.toUpperCase();
  if (id.startsWith("EX")) return "Excavator";
  if (id.startsWith("WL")) return "Wheel Loader";
  if (id.startsWith("BD") || id.startsWith("DZ")) return "Bulldozer";
  return "Dump Truck";
}

function buildStats(units: Unit[]): Stats {
  const total = units.length;
  const ready = units.filter((u) => u.status === "READY").length;
  const notReady = total - ready;
  const fuelIssues = units.filter((u) => u.fuel === "NOT OK").length;
  const lubeIssues = units.filter((u) => u.lube === "NOT OK").length;
  const fireIssues = units.filter((u) => u.fire === "NOT OK").length;
  const gpsIssues = units.filter((u) => u.gps === "NOT OK").length;
  return {
    total,
    ready,
    notReady,
    availability: total ? Math.round((ready / total) * 100) : 0,
    issues: { fuel: fuelIssues, lube: lubeIssues, fire: fireIssues, gps: gpsIssues },
    systemHealth: {
      fuel: { normal: total - fuelIssues, fault: fuelIssues },
      lube: { normal: total - lubeIssues, fault: lubeIssues },
      fire: { normal: total - fireIssues, fault: fireIssues },
      gps: { normal: total - gpsIssues, fault: gpsIssues },
    },
  };
}

function buildOpenAlerts(units: Unit[]): Alert[] {
  const alerts: Alert[] = [];
  for (const u of units) {
    if (u.status !== "NOT READY") continue;
    for (const rootCause of u.rootCauses) {
      alerts.push({
        id: `${u.id}-${rootCause}`,
        unitId: u.id,
        message: rootCause,
        severity: "critical",
        minsAgo: u.minsAgo,
        time: u.lastUpdate,
        status: "open",
      });
    }
  }
  return alerts.sort((a, b) => a.minsAgo - b.minsAgo);
}

function unitFromIntecsResponse(unitId: string, response: IntecsUnitResponse): Unit {
  const fuelRecords = response.fuelData ?? [];
  const autolubeRecords = response.autolubeData ?? [];
  const ansulRecords = response.ansulData ?? [];
  const musterRecords = response.musterData ?? [];

  const latestFuel = newestByCreatedAt(fuelRecords);
  const latestLube = newestByCreatedAt(autolubeRecords);
  const latestFire = newestByCreatedAt(ansulRecords);
  const latestMuster = newestByCreatedAt(musterRecords);
  const latestIso = [latestFuel?.createdAt, latestLube?.createdAt, latestFire?.createdAt, latestMuster?.createdAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1);
  const minsAgo = minutesSince(latestIso);
  const online = minsAgo <= 15;

  const flowLitresPerMinute =
    readingValue(latestFuel?.flowrate_differential) ??
    Math.abs((readingValue(latestFuel?.flowrate_a) ?? 0) - (readingValue(latestFuel?.flowrate_b) ?? 0));
  const positiveFlowRates = fuelRecords
    .map((record) => readingValue(record.flowrate_differential))
    .filter((value): value is number => typeof value === "number" && value > 0);
  const baselineFlow = positiveFlowRates.length
    ? positiveFlowRates.reduce((sum, value) => sum + value, 0) / positiveFlowRates.length
    : flowLitresPerMinute || 0.7;
  const fuelRate = Math.round(flowLitresPerMinute * 60);
  const fuelBaseline = Math.max(1, Math.round(baselineFlow * 60));
  const fuelErrorCode = readingValue(latestFuel?.error_code) ?? 0;
  const fuel: DeviceStatus = fuelErrorCode > 0 || fuelRate > fuelBaseline * 1.4 ? "NOT OK" : "OK";

  const lubeFaultCount = autolubeRecords.filter((record) => record.events?.lowLevel || record.events?.faultLamp).length;
  const lubeState: "RUN" | "PAUSE" = latestLube?.events?.pressureSwitch ? "RUN" : "PAUSE";
  const lube: DeviceStatus = lubeFaultCount > 0 ? "NOT OK" : "OK";

  const eventDesc = latestFire?.events?.eventDesc?.toLowerCase() ?? "";
  const hasAnsulFault = Boolean(latestFire && !/normal|ok|clear|test/.test(eventDesc));
  const fire: DeviceStatus = hasAnsulFault ? "NOT OK" : "OK";
  const fireTelemetry: UnitTelemetry["fire"] = {
    detection1: hasAnsulFault && !eventDesc.includes("discharge") ? "TRIGGERED" : "NORMAL",
    detection: "NORMAL",
    discharge: eventDesc.includes("discharge") ? "YES" : "NO",
    power: eventDesc.includes("power") ? "LOST" : "OK",
    releaseValve: eventDesc.includes("release") ? "OPEN" : "CLOSED",
    isolate: eventDesc.includes("isolat") ? "ENABLED" : "DISABLED",
    engineShutdown: eventDesc.includes("shutdown") ? "ACTIVE" : "READY",
  };

  const gps = "OK" as DeviceStatus;

  let finalFuel: DeviceStatus = fuel;
  let finalLube: DeviceStatus = lube;
  let finalFire: DeviceStatus = fire;
  let finalGps: DeviceStatus = gps;
  let rootCauses: string[] = [];

  if (!online) {
    finalFuel = "NOT OK";
    finalLube = "NOT OK";
    finalFire = "NOT OK";
    finalGps = "NOT OK";
    rootCauses = ["Logger Offline"];
  } else {
    if (fuel === "NOT OK") rootCauses.push(fuelErrorCode > 0 ? `Fuel Error Code ${fuelErrorCode}` : "High Fuel Consumption");
    if (lube === "NOT OK") rootCauses.push("Autolube Fault");
    if (fire === "NOT OK") rootCauses.push(latestFire?.events?.eventDesc ?? "ANSUL Event");
    if (gps === "NOT OK") rootCauses.push("GPS Fault");
  }

  const ready = finalFuel === "OK" && finalLube === "OK" && finalFire === "OK" && finalGps === "OK" && online;
  const lastSeen = latestIso ? new Date(latestIso) : undefined;

  return {
    id: response.unit?.id_unit ?? unitId,
    type: inferFleetType(unitId),
    fire: finalFire,
    fuel: finalFuel,
    lube: finalLube,
    gps: finalGps,
    online,
    status: ready ? "READY" : "NOT READY",
    rootCauses,
    rootCauseLabel: rootCauses.length ? rootCauses.join(", ") : "—",
    lastUpdate: lastSeen ? formatDateTime(lastSeen) : "NO DATA",
    lastSeenISO: latestIso ? formatIsoDay(new Date(latestIso)) : formatIsoDay(new Date(0)),
    minsAgo,
    telemetry: {
      fuel: { rate: fuelRate, baseline: fuelBaseline, flowrate: Math.round(flowLitresPerMinute) },
      lube: { state: lubeState, faultCount: lubeFaultCount },
      fire: fireTelemetry,
      gps: {
        lat: typeof latestFuel?.lat === "number" ? latestFuel.lat.toFixed(6) : "0.000000",
        lon: typeof latestFuel?.lon === "number" ? latestFuel.lon.toFixed(6) : "0.000000",
        speed: Math.round(latestFuel?.speed ?? 0),
      },
    },
  };
}

async function fetchIntecsUnit(unitId: string, dateStart: string, dateEnd: string, apiKey: string): Promise<FetchedIntecsUnit> {
  const merged: Required<Pick<IntecsUnitResponse, "fuelData" | "musterData" | "autolubeData" | "ansulData">> = {
    fuelData: [],
    musterData: [],
    autolubeData: [],
    ansulData: [],
  };
  let unit: IntecsUnitResponse["unit"];
  let nextToken: string | null | undefined;
  const rawPages: RawIntecsApiResponse[] = [];

  do {
    const requestNextToken = nextToken ?? null;
    const url = new URL("/unit", INTECS_API_BASE_URL);
    url.searchParams.set("unitId", unitId);
    url.searchParams.set("dateStart", dateStart);
    url.searchParams.set("dateEnd", dateEnd);
    url.searchParams.set("limit", String(INTECS_API_LIMIT));
    if (nextToken) url.searchParams.set("nextToken", nextToken);

    const response = await fetch(url, {
      headers: { "x-api-key": apiKey },
      next: { revalidate: INTECS_API_REVALIDATE_SECONDS },
    });
    if (!response.ok) throw new Error(`INTECS API ${response.status} for ${unitId}: ${await response.text()}`);

    const page = (await response.json()) as IntecsUnitResponse;
    rawPages.push({
      request: { unitId, dateStart, dateEnd, nextToken: requestNextToken },
      response: page,
    });
    unit ??= page.unit;
    merged.fuelData.push(...(page.fuelData ?? []));
    merged.musterData.push(...(page.musterData ?? []));
    merged.autolubeData.push(...(page.autolubeData ?? []));
    merged.ansulData.push(...(page.ansulData ?? []));
    nextToken = page.nextToken;
  } while (nextToken);

  return { merged: { unit, ...merged, nextToken: null }, rawPages };
}


export async function getFleetSnapshot(options: FleetSnapshotOptions = {}): Promise<FleetSnapshot> {
  const apiKey = process.env.INTECS_API_KEY ?? process.env.INTECS_PUBLIC_API_KEY;
  const unitIds = parseConfiguredUnitIds();
  if (!apiKey || unitIds.length === 0) {
    throw new Error("INTECS_API_KEY is not configured or unitIds are empty.");
  }

  const now = new Date();
  const dateStart =
    options.dateRange?.dateStart ??
    process.env.INTECS_DATE_START ??
    new Date(now.getTime() - INTECS_API_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const dateEnd = options.dateRange?.dateEnd ?? process.env.INTECS_DATE_END ?? now.toISOString();

  const responses = await Promise.all(unitIds.map((unitId) => fetchIntecsUnit(unitId, dateStart, dateEnd, apiKey)));
  const units = responses.map((response, index) => unitFromIntecsResponse(unitIds[index], response.merged));
  const alerts = buildOpenAlerts(units);
  const stats = buildStats(units);
  const freshest = units.slice().sort((a, b) => a.minsAgo - b.minsAgo)[0];
  return {
    units,
    alerts,
    stats,
    lastUpdate: freshest?.lastUpdate ?? "NO DATA",
    source: "api",
    rawApiResponses: responses.flatMap((response) => response.rawPages),
  };
}

export async function getFleetUnit(id: string, options: FleetSnapshotOptions = {}): Promise<Unit | undefined> {
  const snapshot = await getFleetSnapshot(options);
  return snapshot.units.find((unit) => unit.id === id);
}

export async function getUnitHistory(
  unitId: string,
  options: { dateRange?: Pick<FleetDateRange, "dateStart" | "dateEnd"> } = {}
): Promise<IntecsUnitResponse> {
  const apiKey = process.env.INTECS_API_KEY ?? process.env.INTECS_PUBLIC_API_KEY;
  const now = new Date();
  const dateStart = options.dateRange?.dateStart ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dateEnd = options.dateRange?.dateEnd ?? now.toISOString();

  if (!apiKey) {
    throw new Error("INTECS_API_KEY is not configured.");
  }

  const result = await fetchIntecsUnit(unitId, dateStart, dateEnd, apiKey);
  return result.merged;
}

