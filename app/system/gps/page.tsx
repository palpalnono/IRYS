import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import GpsView from "@/components/GpsView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "GPS" };

export default async function GpsSystemPage() {
  const { units, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="GPS">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={lastUpdate} />
      <GpsView units={units} />
    </div>
  );
}
