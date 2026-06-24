import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import DeviceView from "@/components/DeviceView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "IRYS Device" };

export default async function DevicePage() {
  const { units, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="IRYS Device">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={lastUpdate} />
      <DeviceView units={units} />
    </div>
  );
}
