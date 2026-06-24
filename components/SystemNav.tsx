// Shared cross-link nav for system pages so users can hop between
// CAS / Lube / Fire / GPS / IRYS Device without bouncing through Overview.
import Link from "next/link";
import { SysIcon } from "./atoms";

type SystemKey = "cas" | "fuel" | "lube" | "fire" | "gps" | "device";

const ITEMS: { k: SystemKey; label: string; href: string; icon: React.ReactNode }[] = [
  { k: "cas",    label: "CAS",    href: "/system/cas",    icon: SysIcon.logger },
  { k: "lube",   label: "LUBE",   href: "/system/lube",   icon: SysIcon.lube   },
  { k: "fire",   label: "FIRE",   href: "/system/fire",   icon: SysIcon.fire   },
  { k: "gps",    label: "GPS",    href: "/system/gps",    icon: SysIcon.gps    },
  { k: "device", label: "IRYS",   href: "/system/device", icon: SysIcon.logger },
];

export default function SystemNav({ active }: { active: SystemKey }) {
  return (
    <div className="system-nav">
      {ITEMS.map((it) => (
        <Link
          key={it.k}
          href={it.href}
          className={`system-nav-item ${it.k === active ? "active" : ""}`}
          aria-current={it.k === active ? "page" : undefined}
        >
          <span className="system-nav-icon">{it.icon}</span>
          <span>{it.label}</span>
        </Link>
      ))}
    </div>
  );
}
