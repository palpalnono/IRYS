import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import LubeView from "@/components/LubeView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Lube System" };

export default async function LubeSystemPage() {
  const { units, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="Lube System">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={lastUpdate} />
      <LubeView units={units} />
    </div>
  );
}
