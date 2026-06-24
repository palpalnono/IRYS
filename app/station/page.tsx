// Bare /station landing — redirect into the first section so the page
// always opens with content. Same pattern the IRYS Header uses when it
// links to /system/cas rather than a bare /system.
import { redirect } from 'next/navigation';

export default function StationIndexPage() {
  redirect('/station/fms');
}
