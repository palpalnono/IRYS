export interface FleetDateRange {
  dateStart: string;
  dateEnd: string;
  inputStart: string;
  inputEnd: string;
  label: string;
}

const DEFAULT_TIME_ZONE = process.env.INTECS_TIME_ZONE ?? "Asia/Jakarta";

function dateInTimeZone(timeZone: string, offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function isDateOnly(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isDateTimeInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value));
}

function displayDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function displayDateTime(value: string): string {
  const [date, time] = value.split("T");
  return `${displayDate(date)} ${time}`;
}

function dateTimeInput(value: string | undefined, fallbackDate: string, fallbackTime: string): string {
  if (isDateTimeInput(value)) return value;
  if (isDateOnly(value)) return `${value}T${fallbackTime}`;
  if (value) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 16);
  }
  return `${fallbackDate}T${fallbackTime}`;
}

function apiTimestamp(value: string, boundary: "start" | "end"): string {
  const dt = new Date(`${value}:${boundary === "start" ? "00" : "59"}`);
  if (Number.isFinite(dt.getTime())) {
    return dt.toISOString();
  }
  return `${value}:${boundary === "start" ? "00.000" : "59.999"}Z`;
}

export function resolveFleetDateRange(searchParams?: Record<string, string | string[] | undefined>): FleetDateRange {
  const today = dateInTimeZone(DEFAULT_TIME_ZONE, 0);
  const sevenDaysAgo = dateInTimeZone(DEFAULT_TIME_ZONE, -6); // 7 days inclusive
  const rawStart = Array.isArray(searchParams?.dateStart) ? searchParams?.dateStart[0] : searchParams?.dateStart;
  const rawEnd = Array.isArray(searchParams?.dateEnd) ? searchParams?.dateEnd[0] : searchParams?.dateEnd;
  let dateStart = isDateOnly(rawStart) ? rawStart : process.env.INTECS_DATE_START ?? sevenDaysAgo;
  let dateEnd = isDateOnly(rawEnd) ? rawEnd : process.env.INTECS_DATE_END ?? today;

  if (dateStart > dateEnd) [dateStart, dateEnd] = [dateEnd, dateStart];

  const label = dateStart === dateEnd ? displayDate(dateStart) : `${displayDate(dateStart)} to ${displayDate(dateEnd)}`;
  return { dateStart, dateEnd, inputStart: dateStart, inputEnd: dateEnd, label };
}

export function resolveFleetDateTimeRange(searchParams?: Record<string, string | string[] | undefined>): FleetDateRange {
  const today = dateInTimeZone(DEFAULT_TIME_ZONE, 0);
  const sevenDaysAgo = dateInTimeZone(DEFAULT_TIME_ZONE, -6);
  const rawStart = Array.isArray(searchParams?.dateStart) ? searchParams?.dateStart[0] : searchParams?.dateStart;
  const rawEnd = Array.isArray(searchParams?.dateEnd) ? searchParams?.dateEnd[0] : searchParams?.dateEnd;
  let inputStart = dateTimeInput(rawStart ?? process.env.INTECS_DATE_START, sevenDaysAgo, "00:00");
  let inputEnd = dateTimeInput(rawEnd ?? process.env.INTECS_DATE_END, today, "23:59");

  if (inputStart > inputEnd) [inputStart, inputEnd] = [inputEnd, inputStart];

  const label = inputStart === inputEnd
    ? displayDateTime(inputStart)
    : `${displayDateTime(inputStart)} to ${displayDateTime(inputEnd)}`;

  return {
    dateStart: apiTimestamp(inputStart, "start"),
    dateEnd: apiTimestamp(inputEnd, "end"),
    inputStart,
    inputEnd,
    label,
  };
}
