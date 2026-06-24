import 'server-only';
import type {
  FuelType,
  Tank,
  FmsTransaction,
  FmsTransfer,
  FmsDelivery,
  TankSeries,
  SeriesPoint,
} from './klubher-types';

export type {
  FuelType,
  WaterStatus,
  Tank,
  FmsTransaction,
  FmsTransfer,
  FmsDelivery,
  SeriesPoint,
  TankSeries,
} from './klubher-types';

export {
  TEMP_THRESHOLDS,
  WATER_PPM_THRESHOLDS,
  WATER_SAT_THRESHOLDS,
  ISO_TARGET,
  DENSITY_THRESHOLDS,
  LOW_STOCK_PCT,
  classifyTemp,
  classifyWaterPpm,
  classifyWaterSat,
  classifyCleanliness,
  classifyDensity,
  parseIsoCode,
} from './klubher-types';

export const TANKS: Tank[] = [];
export const TANK_SERIES: TankSeries[] = [];
export const LAST_UPDATE: string = new Date().toISOString();
export const FMS_TRANSACTIONS: FmsTransaction[] = [];
export const FMS_TRANSFERS: FmsTransfer[] = [];
export const FMS_DELIVERIES: FmsDelivery[] = [];

export function getTank(id: string): Tank | undefined {
  return undefined;
}
