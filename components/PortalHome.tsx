// Portal home — the IRYS-branded entry point for the active product.
// Renders server-side with live Fleet counts so the operator gets a
// one-glance health summary before entering the dashboard.
import Link from "next/link";
import Image from "next/image";
import { SysIcon } from "@/components/atoms";
import type { Stats } from "@/lib/data";

interface Props {
  stats: Stats;
}

export default function PortalHome({ stats }: Props) {
  return (
    <main className="portal">
      <div className="portal-brand">
        <Image src="/intecs-logo.png" alt="INTECS" width={120} height={46} priority style={{ display: "block" }} />
        <div className="portal-brand-text">
          <div className="portal-wordmark">IRYS</div>
          <div className="portal-tagline">Uptime Optimization Platform</div>
        </div>
      </div>

      <div className="portal-prompt">Open your dashboard</div>

      <div className="portal-grid">
        {/* ---- Fleet --------------------------------------------------- */}
        <Link href="/fleet" className="portal-tile" aria-label="Open Fleet · Mobile Equipment dashboard">
          <div className="portal-tile-icon">{SysIcon.excavator}</div>
          <div className="portal-tile-body">
            <div className="portal-tile-name">Fleet</div>
            <div className="portal-tile-sub">Mobile equipment monitoring</div>
          </div>
          <dl className="portal-tile-stats">
            <div>
              <dt>Units</dt>
              <dd className="tabular-nums">{stats.total}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd className="tabular-nums portal-stat-ok">{stats.ready}</dd>
            </div>
            <div>
              <dt>Not ready</dt>
              <dd className={`tabular-nums ${stats.notReady > 0 ? "portal-stat-bad" : "portal-stat-ok"}`}>
                {stats.notReady}
              </dd>
            </div>
          </dl>
          <div className="portal-tile-cta">
            Open
            <span aria-hidden="true" className="portal-tile-arrow">→</span>
          </div>
        </Link>
      </div>
    </main>
  );
}
