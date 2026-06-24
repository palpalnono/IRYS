import type { Metadata } from 'next';
import FmsDataView from '@/components/klubher/FmsDataView';
import {
  TANKS,
  FMS_TRANSACTIONS,
  FMS_TRANSFERS,
  FMS_DELIVERIES,
} from '@/lib/klubher-data';

export const metadata: Metadata = { title: 'FMS' };

export default function KlubherFmsPage() {
  return (
    <FmsDataView
      tanks={TANKS}
      transactions={FMS_TRANSACTIONS}
      transfers={FMS_TRANSFERS}
      deliveries={FMS_DELIVERIES}
    />
  );
}
