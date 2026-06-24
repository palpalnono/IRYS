import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import FireView from "@/components/FireView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Fire System" };

export default async function FireSystemPage() {
  const { units, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="Fire System">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={lastUpdate} />
      <FireView units={units} />
    </div>
  );
}
