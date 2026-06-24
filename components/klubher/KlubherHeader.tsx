// Header for the Fuel Station product (Klubher). The persistent brand
// is IRYS — the platform — and the sub-label tells the user which
// product they're inside. Clicking the brand returns to the portal
// chooser at /; intra-product navigation lives in KlubherNav.
import Link from 'next/link';
import Image from 'next/image';

export default function KlubherHeader({ lastUpdate }: { lastUpdate?: string }) {
  return (
    <header className="header klubher-header">
      <Link href="/" className="brand brand-clickable" title="IRYS portal">
        <div className="brand-mark">
          <Image
            src="/intecs-logo.png"
            alt="INTECS"
            width={84}
            height={32}
            priority
            style={{ display: 'block' }}
          />
        </div>
        <div className="brand-text">
          <div className="brand-title">IRYS</div>
          <div className="brand-sub">Fuel Station · Klubher</div>
        </div>
      </Link>
      {lastUpdate && (
        <div className="header-meta">
          <div className="last-update">
            <div className="meta-label">Updated</div>
            <div className="meta-value">{lastUpdate}</div>
          </div>
        </div>
      )}
    </header>
  );
}
