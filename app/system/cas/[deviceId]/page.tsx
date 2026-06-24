import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CasDeviceDetail from "@/components/CasDeviceDetail";
import Header from "@/components/Header";
import { getCasSnapshot } from "@/lib/cas-data";

export const metadata: Metadata = { title: "CAS Device" };

export default async function CasDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const resolvedParams = await params;
  const snapshot = await getCasSnapshot();
  const deviceId = Number(resolvedParams.deviceId);
  const device = snapshot.devices.find((item) => item.deviceId === deviceId);

  if (!device) notFound();

  return (
    <div className="app density-comfortable" data-screen-label="CAS Device">
      <div className="bg-spotlight" />
      <Header view="system" lastUpdate={snapshot.lastUpdate} />
      <CasDeviceDetail device={device} snapshot={snapshot} />
    </div>
  );
}
