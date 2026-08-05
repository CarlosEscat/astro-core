import tzlookup from "tz-lookup";

/**
 * Birth-local wall-clock time → UTC instant, using the IANA timezone
 * database offset AT THE BIRTH DATE (never the current offset). This is
 * the integration contract computeNatalChart depends on: feed it the
 * returned `utc` and the chart is correct; feed it a browser-local
 * conversion and every chart is silently wrong.
 *
 * The offset source is the Node/ICU copy of the tz database via Intl —
 * full historical rules, zero network calls.
 */
export interface BirthLocalTime {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23, local wall clock at the birth place */
  hour: number;
  minute: number;
}

export interface ResolvedBirth {
  utc: Date;
  /** IANA zone the coordinates fall in, e.g. "Europe/Madrid" */
  timeZone: string;
  /** Offset applied, minutes east of UTC (CEST = 120) */
  offsetMinutes: number;
}

/** Zone offset in minutes east of UTC at a given instant. */
function offsetAt(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(utcMs));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0; // plain "GMT"
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

export function resolveBirthUtc(
  local: BirthLocalTime,
  latitude: number,
  longitude: number,
): ResolvedBirth {
  const timeZone = tzlookup(latitude, longitude);

  // Read the wall-clock fields as if they were UTC, then subtract the
  // zone offset. One correction pass handles instants near a transition;
  // nonexistent spring-forward times resolve to a deterministic adjacent
  // instant instead of throwing.
  const wallAsUtc = Date.UTC(
    local.year, local.month - 1, local.day, local.hour, local.minute,
  );
  const first = offsetAt(wallAsUtc, timeZone);
  const second = offsetAt(wallAsUtc - first * 60_000, timeZone);
  const utc = new Date(wallAsUtc - second * 60_000);

  return { utc, timeZone, offsetMinutes: second };
}
