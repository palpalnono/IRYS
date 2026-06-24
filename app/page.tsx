// IRYS portal — the entry screen for the active product. Server component;
// fetches Fleet summary counts and passes them down.
import type { Metadata } from "next";
import PortalHome from "@/components/PortalHome";
import { getFleetSnapshot } from "@/lib/data";

export const metadata: Metadata = { title: "IRYS Portal" };

export default async function PortalPage() {
  const { stats } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="IRYS Portal">
      <div className="bg-spotlight" />
      <PortalHome stats={stats} />
    </div>
  );
}
