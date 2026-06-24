import { Suspense } from "react";
import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import UnitsView from "@/components/UnitsView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Units" };

export default async function UnitsPage() {
  const { units, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="Units">
      <div className="bg-spotlight" />
      <Header view="units" lastUpdate={lastUpdate} />
      <Suspense fallback={null}>
        <UnitsView units={units} />
      </Suspense>
    </div>
  );
}
