import type { Metadata } from "next";
import CasView from "@/components/CasView";
import Header from "@/components/Header";
import { getCasSnapshot } from "@/lib/cas-data";

export const metadata: Metadata = { title: "CAS System" };

export default async function CasSystemPage() {
  const snapshot = await getCasSnapshot();
  return (
    <div className="app density-comfortable" data-screen-label="CAS System">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={snapshot.lastUpdate} />
      <CasView snapshot={snapshot} />
    </div>
  );
}
