import type { Metadata } from 'next';
import FuelInventoryView from '@/components/klubher/FuelInventoryView';
import { TANKS } from '@/lib/klubher-data';

export const metadata: Metadata = { title: 'Fuel Inventory' };

export default function KlubherInventoryPage() {
  return <FuelInventoryView tanks={TANKS} />;
}
