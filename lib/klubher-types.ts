// Klubher shared types, thresholds, and pure classification helpers.
// Lives outside the 'server-only' boundary so client components can
// import the value exports (thresholds, classify*) without forcing them
// into the server bundle. Data tables themselves (TANKS, FMS_*) stay in
// lib/klubher-data.ts behind 'server-only'.

export type FuelType = 'Diesel' | 'Petrol';
export type WaterStatus = 'Normal' | 'Warning' | 'Critical';

// Tank — modelled on the SmartFill "Tanks" page. A controller exposes
// one or more tanks, each with a Safe Fill Level (SFL) below capacity.
// The Fuel-Condition fields (tempC, waterPpm, waterSatPct, isoCleanCode,
// densityKgM3) live alongside the inventory data because the dashboard
// joins both views per tank. Thresholds + classifiers below define the
// alert tiers; the view annotates each as either a per-delivery reading
// (LCR-IQ) or a circulation-loop reading (particle counter for ISO 4406).
export interface Tank {
  id: string;
  description: string;
  unitName: string;
  unitNumber: string;
  tankNumber: string;
  fuelType: FuelType;
  volumetricUnit: 'Litres';
  capacity: number;
  sfl: number;
  volume: number;

  // Fuel Condition readings — diesel-specific bands (per ISO/industry
  // standards). The same values are stored for petrol tanks for now;
  // the view layer flags/hides parameters that don't apply.
  tempC: number;
  waterPpm: number;        // parts-per-million of water
  waterSatPct: number;     // % saturation (relative humidity in fuel)
  isoCleanCode: string;    // ISO 4406 code, e.g. "14/12/9"
  densityKgM3: number;     // density in kg/m³

  lastDip: string;
  lastDipISO: string;
  minsAgo: number;
  online: boolean;
  status: 'Online' | 'Offline';
  dipMethod: 'Auto' | 'Manual';
}

export interface FmsTransaction {
  id: string;
  date: string;
  time: string;
  description: string;
  registration: string;
  make: string;
  litres: number;
  unitPrice: number;
  totalPrice: number;
  minsAgo: number;
}

export interface FmsTransfer {
  id: string;
  date: string;
  time: string;
  unitName: string;
  pump: string;
  flowmeter: string;
  pumpName: string;
  fromTank: string;
  toTank: string;
  volume: number;
  units: string;
  reference: string;
  driverName: string;
  driverCode: string;
  minsAgo: number;
}

export interface FmsDelivery {
  id: string;
  timestamp: string;
  supplier: string;
  tankId: string;
  volumeL: number;
  batchRef: string;
  status: 'Received' | 'Pending QC' | 'Rejected';
  minsAgo: number;
}

export interface SeriesPoint {
  hoursAgo: number;
  value: number;
}

// 168h hourly trend per Fuel Condition parameter. Cleanliness isn't
// continuous (ISO 4406 codes are discrete tiers) but we still expose a
// numeric trend tracking the worst-code component (14 µm channel) so it
// can be charted on the same canvas as the other readings.
export interface TankSeries {
  tankId: string;
  temp: SeriesPoint[];
  waterPpm: SeriesPoint[];
  waterSat: SeriesPoint[];
  isoWorst: SeriesPoint[];     // worst (14 µm) ISO 4406 channel
  density: SeriesPoint[];
}

// ===========================================================================
// THRESHOLDS — industry bands per parameter. The view layer reads these so
// chips + chart guide-lines stay in sync with the classify* helpers below.
// ===========================================================================

export const TEMP_THRESHOLDS = {
  normalMin: 10,
  normalMax: 35,
  criticalMin: 5,
  criticalMax: 40,
};

// Water in fuel — ppm: parts per million absolute. Industry rule of
// thumb for modern diesel common-rail systems is < 200 ppm; below 100
// is comfortable. Above 200 ppm is the corrosion / microbial-growth
// red zone.
export const WATER_PPM_THRESHOLDS = {
  warning: 100,
  critical: 200,
};

// Water as % saturation (relative humidity of water in the fuel column).
// Above ~85% the water phase-separates into free water at the tank floor.
export const WATER_SAT_THRESHOLDS = {
  warning: 60,
  critical: 85,
};

// ISO 4406 cleanliness spec for bulk diesel storage tanks. Each number
// is the ISO range code for particle counts at 4 µm / 6 µm / 14 µm.
// 18/16/13 is the conventional storage spec (Donaldson / Pall guidance
// for fuel held in bulk before dispensing); fresh common-rail injection
// targets are much tighter (12/9/6) but apply downstream of the filter.
export const ISO_TARGET = '18/16/13';

// Density band — diesel (B0–B35 per ISO/industry standards).
// B50 stretches to ~870, B100/FAME to ~900 — out of scope for now.
// Petrol sits much lower (~720–770) — the view shows N/A for petrol
// tanks until per-grade bands are wired in.
export const DENSITY_THRESHOLDS = {
  normalMin: 820,
  normalMax: 860,
  warningMin: 815,
  warningMax: 865,
};

export const LOW_STOCK_PCT = 0.2;

// ===========================================================================
// CLASSIFIERS — pure functions, used by chips, banners, and trend bands.
// ===========================================================================

export function classifyTemp(c: number): WaterStatus {
  if (c <= TEMP_THRESHOLDS.criticalMin || c >= TEMP_THRESHOLDS.criticalMax) return 'Critical';
  if (c <= TEMP_THRESHOLDS.normalMin  || c >= TEMP_THRESHOLDS.normalMax)  return 'Warning';
  return 'Normal';
}

export function classifyWaterPpm(ppm: number): WaterStatus {
  if (ppm >= WATER_PPM_THRESHOLDS.critical) return 'Critical';
  if (ppm >= WATER_PPM_THRESHOLDS.warning)  return 'Warning';
  return 'Normal';
}

export function classifyWaterSat(pct: number): WaterStatus {
  if (pct >= WATER_SAT_THRESHOLDS.critical) return 'Critical';
  if (pct >= WATER_SAT_THRESHOLDS.warning)  return 'Warning';
  return 'Normal';
}

// Parse an ISO 4406 "A/B/C" code into its three numeric channels.
export function parseIsoCode(code: string): [number, number, number] | null {
  const parts = code.split('/').map((s) => Number(s.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

// Compare an ISO 4406 reading to the storage target. Each channel that
// exceeds the target by 3+ codes is considered Critical (~10× the
// particle count); 1–2 codes over → Warning; otherwise Normal.
export function classifyCleanliness(code: string): WaterStatus {
  const reading = parseIsoCode(code);
  const target = parseIsoCode(ISO_TARGET);
  if (!reading || !target) return 'Normal';
  const deltas = reading.map((n, i) => n - target[i]);
  const worst = Math.max(0, ...deltas);
  if (worst >= 3) return 'Critical';
  if (worst >= 1) return 'Warning';
  return 'Normal';
}

export function classifyDensity(d: number): WaterStatus {
  if (d < DENSITY_THRESHOLDS.warningMin || d > DENSITY_THRESHOLDS.warningMax) return 'Critical';
  if (d < DENSITY_THRESHOLDS.normalMin  || d > DENSITY_THRESHOLDS.normalMax)  return 'Warning';
  return 'Normal';
}
