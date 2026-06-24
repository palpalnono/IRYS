import type { CasAlarm, CasDevice, CasReadiness } from "@/lib/cas-data";

export function getCasReadiness(device: CasDevice, alarms: CasAlarm[]): CasReadiness {
  const hasActiveAlarm = alarms.some((alarm) => alarm.deviceId === device.deviceId);
  return hasActiveAlarm || !device.gpsTime ? "Fault" : "Ready";
}

export function getCasEvidenceLabel(alarm: CasAlarm, devices: CasDevice[]): string {
  if (alarm.videoId) return "Video ready";

  const device = devices.find((item) => item.deviceId === alarm.deviceId);
  if (device && device.recordFileCount > 0) return "Record ready";

  return "No record";
}
