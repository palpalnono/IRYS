import type { Metadata } from "next";
import { getFleetSnapshot } from "@/lib/data";
import AlertsView from "@/components/AlertsView";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const { alerts, lastUpdate } = await getFleetSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="Alerts">
      <div className="bg-spotlight" />
      <Header view="alerts" lastUpdate={lastUpdate} />
      <AlertsView alerts={alerts} />
    </div>
  );
}
