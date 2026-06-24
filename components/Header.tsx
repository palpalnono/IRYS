// Header for the Fleet product (mobile construction equipment). The
// persistent brand is IRYS — the platform — with a sub-label telling
// the user which product they're inside. Clicking the brand returns
// to the portal chooser at /; the nav handles intra-product navigation
// (Overview / Units / System / Alerts), with Overview pointing to the
// product home at /fleet.
import Link from "next/link";
import Image from "next/image";

export default function Header({
  view,
  lastUpdate,
}: {
  view: "overview" | "units" | "alerts" | "system";
  lastUpdate?: string;
}) {
  return (
    <header className="header">
      <Link href="/" className="brand brand-clickable" title="IRYS portal">
        <div className="brand-mark">
          <Image src="/intecs-logo.png" alt="INTECS" width={84} height={32} priority style={{ display: "block" }} />
        </div>
        <div className="brand-text">
          <div className="brand-title">IRYS</div>
          <div className="brand-sub">Fleet · Mobile Equipment</div>
        </div>
      </Link>
      <nav className="nav">
        <Link href="/fleet" className={`nav-btn ${view === "overview" ? "active" : ""}`}>
          Overview
        </Link>
        <Link href="/units" className={`nav-btn ${view === "units" ? "active" : ""}`}>
          Units
        </Link>
        <Link href="/system/cas" className={`nav-btn ${view === "system" ? "active" : ""}`}>
          System
        </Link>
        <Link href="/alerts" className={`nav-btn ${view === "alerts" ? "active" : ""}`}>
          Alerts
        </Link>
      </nav>
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
