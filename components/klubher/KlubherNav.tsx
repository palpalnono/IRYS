// Three-tab section nav for /station/*. Mirrors components/SystemNav.tsx.
// Fuel Condition spans two measurement contexts: per-delivery readings
// (temperature, water contaminant, density — LCR-IQ inline meter on the
// delivery hose) plus a circulation-loop reading (ISO 4406 cleanliness —
// particle counter on the recirc / filter loop).
import Link from 'next/link';

export type KlubherSection = 'fms' | 'inventory' | 'condition';

const ITEMS: { k: KlubherSection; label: string; href: string; icon: React.ReactNode }[] = [
  {
    k: 'fms',
    label: 'FMS',
    href: '/station/fms',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M9 4v16" />
      </svg>
    ),
  },
  {
    k: 'inventory',
    label: 'INVENTORY',
    href: '/station/inventory',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M4 13h16" />
        <path d="M8 6V4h8v2" />
      </svg>
    ),
  },
  {
    k: 'condition',
    label: 'FUEL CONDITION',
    href: '/station/condition',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Thermometer + droplet hybrid — temperature, water & quality. */}
        <path d="M14 14V5a2 2 0 10-4 0v9a4 4 0 104 0z" />
        <circle cx="12" cy="17" r="1.3" fill="currentColor" />
        <path d="M18 4l2.5 4a3 3 0 11-5 0z" />
      </svg>
    ),
  },
];

export default function KlubherNav({ active }: { active: KlubherSection }) {
  return (
    <div className="system-nav klubher-nav">
      {ITEMS.map((it) => (
        <Link
          key={it.k}
          href={it.href}
          className={`system-nav-item ${it.k === active ? 'active' : ''}`}
          aria-current={it.k === active ? 'page' : undefined}
        >
          <span className="system-nav-icon">{it.icon}</span>
          <span>{it.label}</span>
        </Link>
      ))}
    </div>
  );
}
