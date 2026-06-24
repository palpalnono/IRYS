"use client";
import { useRouter } from "next/navigation";
import type { Route } from "next";

// Returns to the page the user actually came from instead of always dumping
// them on the Overview. We can't statically know the origin (a unit detail is
// reachable from /units, /alerts, an Overview tile, or a system page), so we
// step back through browser history when there's in-app history to step back
// to, and fall back to a sane route (default "/") on a cold/direct landing
// (new tab, deep link, refresh) where history.length === 1.
export default function BackButton({
  fallback = "/" as Route,
  label = "Back",
}: {
  fallback?: Route;
  label?: string;
}) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };
  return (
    <button type="button" onClick={onClick} className="back-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
