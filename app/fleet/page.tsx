import { Suspense } from "react";
import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import { resolveFleetDateRange } from "@/lib/date-range";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = { title: "Fleet" };

// Dashboard reads filter state from useSearchParams, which requires the
// page to either render dynamically or wrap the consumer in Suspense.
// Suspense keeps prerendering possible and is the lighter choice.
export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const dateRange = resolveFleetDateRange(resolvedSearchParams);
  const { units, alerts, stats, lastUpdate } = await getFleetSnapshot({ dateRange });
  return (
    <Suspense fallback={null}>
      <Dashboard
        units={units}
        alerts={alerts}
        stats={stats}
        lastUpdate={lastUpdate}
        dateRange={dateRange}
      />
    </Suspense>
  );
}
