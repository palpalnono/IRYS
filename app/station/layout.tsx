// /station/* shell — Fuel Station product (Klubher). Standalone from the
// Fleet Header. The middleware auth wall still covers this segment
// because it's a non-/login route. Every sub-route renders inside <main>
// below the shared KlubherHeader. The per-section KlubherNav lives
// inside each sub-page view so the active tab can be passed declaratively
// (matches the SystemNav pattern).
import type { Metadata } from 'next';
import KlubherHeader from '@/components/klubher/KlubherHeader';
import { LAST_UPDATE } from '@/lib/klubher-data';

export const metadata: Metadata = {
  title: { default: 'Fuel Station', template: '%s · Fuel Station' },
};

export default function StationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app density-comfortable" data-screen-label="Fuel Station">
      <div className="bg-spotlight" />
      <KlubherHeader lastUpdate={LAST_UPDATE} />
      {children}
    </div>
  );
}
