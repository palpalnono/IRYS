import type { Metadata } from 'next';
import FuelConditionView from '@/components/klubher/FuelConditionView';
import { TANKS, TANK_SERIES } from '@/lib/klubher-data';

export const metadata: Metadata = { title: 'Fuel Condition' };

export default function StationConditionPage() {
  return <FuelConditionView tanks={TANKS} series={TANK_SERIES} />;
}
