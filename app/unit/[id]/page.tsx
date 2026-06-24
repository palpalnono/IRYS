import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFleetSnapshot, getFleetUnit } from "@/lib/data";
import { getCasSnapshot } from "@/lib/cas-data";
import { resolveFleetDateTimeRange } from "@/lib/date-range";
import UnitDetail from "@/components/UnitDetail";
import Header from "@/components/Header";

// notFound() in both generateMetadata and the page component for
// consistency. Note: Next 14 returns the not-found.tsx body but with a
// 200 status code for dynamic routes (the framework treats the segment
// as "matched, just empty"). Tracked in vercel/next.js#49387; reportedly
// fixed in Next 15. The user-visible page is correct; only crawlers and
// uptime monitors see the wrong status, which is acceptable here.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const unit = await getFleetUnit(decodeURIComponent(resolvedParams.id));
  if (!unit) notFound();
  return { title: `${unit.id} (${unit.type})` };
}

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const dateRange = resolveFleetDateTimeRange(resolvedSearchParams);
  const { units, lastUpdate } = await getFleetSnapshot({ dateRange });
  const casSnapshot = await getCasSnapshot();
  const unit = units.find((item) => item.id === decodeURIComponent(resolvedParams.id));
  if (!unit) notFound();
  return (
    <div className="app density-comfortable" data-screen-label="Unit Detail">
      <div className="bg-spotlight" />
      <Header view="overview" lastUpdate={lastUpdate} />
      <UnitDetail unit={unit} dateRange={dateRange} casSnapshot={casSnapshot} />
    </div>
  );
}
