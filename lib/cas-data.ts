import "server-only";

export interface CasDevice {
  deviceId: number;
  plateNumber: string;
  speed: number;
  lat: string;
  lon: string;
  gpsTime: string;
  recordFileCount: number;
}

export type CasReadiness = "Ready" | "Fault";

export interface CasAlarm {
  eventId: string;
  deviceId: number;
  plateNumber: string;
  alarmType: number;
  label: string;
  time: string;
  videoId?: string;
}

export interface CasNamedCount {
  label: string;
  count: number;
}

export interface CasSnapshot {
  devices: CasDevice[];
  alarms: CasAlarm[];
  alarmTypeCounts: CasNamedCount[];
  config: {
    host: string;
    userConfigured: boolean;
    passwordConfigured: boolean;
  };
  stats: {
    totalDevices: number;
    activeAlarms: number;
    unitsWithAlarms: number;
    offlineDevices: number;
    recordReady: number;
    alarmEvents: number;
  };
  lastUpdate: string;
}

const HOST = process.env.STONKAM_CMS_HOST ?? "http://183.233.190.23:6060";


function buildStats(devices: CasDevice[], alarms: CasAlarm[]) {
  const alarmDeviceIds = new Set(alarms.map((alarm) => alarm.deviceId));

  return {
    totalDevices: devices.length,
    activeAlarms: alarms.length,
    unitsWithAlarms: alarmDeviceIds.size,
    offlineDevices: devices.filter((device) => !device.gpsTime).length,
    recordReady: alarms.filter((alarm) => Boolean(alarm.videoId)).length,
    alarmEvents: alarms.length,
  };
}

function buildAlarmTypeCounts(alarms: CasAlarm[]): CasNamedCount[] {
  const counts = new Map<string, number>();
  for (const alarm of alarms) {
    const label = `${alarm.alarmType} - ${alarm.label}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count }));
}

async function fetchLiveCasDevices(): Promise<CasDevice[] | null> {
  const username = process.env.STONKAM_USERNAME;
  const password = process.env.STONKAM_PASSWORD;
  if (!username || !password) return null;

  try {
    const loginRes = await fetch(`${HOST}/RecordDataAuthentication/100`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserName: username, Password: password, AuthType: 1 }),
      next: { revalidate: 60 },
    });
    const loginData = await loginRes.json();
    if (!loginData.Result) return null;
    const sessionId = loginData.SessionId;

    const [devListRes, lastStateRes] = await Promise.all([
      fetch(`${HOST}/GetDeviceList/100?UserName=${username}&SessionId=${sessionId}&Number=1000`, { next: { revalidate: 60 } }),
      fetch(`${HOST}/GetDevicesLastState/100?UserName=${username}&SessionId=${sessionId}`, { next: { revalidate: 60 } })
    ]);

    const devListData = await devListRes.json();
    const lastStateData = await lastStateRes.json();

    if (!devListData.DeviceList || !Array.isArray(lastStateData)) return null;

    const stateMap = new Map();
    for (const state of lastStateData) {
      stateMap.set(state.DeviceId, state);
    }

    const liveDevices: CasDevice[] = devListData.DeviceList.map((d: { DeviceId: number; PlateNumber?: string }) => {
      const state = stateMap.get(d.DeviceId);
      return {
        deviceId: d.DeviceId,
        plateNumber: d.PlateNumber || String(d.DeviceId),
        speed: state?.Speed ?? 0,
        lat: String(state?.Lat ?? 0),
        lon: String(state?.Lon ?? 0),
        gpsTime: state?.GpsTime || "",
        recordFileCount: 0,
      };
    });

    return liveDevices;
  } catch (err) {
    console.error("Failed to fetch Stonkam live data:", err);
    return null;
  }
}

export async function getCasSnapshot(): Promise<CasSnapshot> {
  const liveDevices = await fetchLiveCasDevices();
  const devicesToUse = liveDevices ?? [];
  const lastUpdate = liveDevices?.reduce((latest, d) => (d.gpsTime && d.gpsTime > latest ? d.gpsTime : latest), "") || new Date().toISOString();

  return {
    devices: devicesToUse,
    alarms: [],
    alarmTypeCounts: [],
    config: {
      host: HOST,
      userConfigured: Boolean(process.env.STONKAM_USERNAME),
      passwordConfigured: Boolean(process.env.STONKAM_PASSWORD),
    },
    stats: buildStats(devicesToUse, []),
    lastUpdate: lastUpdate,
  };
}

