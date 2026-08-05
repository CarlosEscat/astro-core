import * as AeModule from "astronomy-engine";
import type { Body } from "./types";
import { norm360, angleDiff } from "./zodiac";

// astronomy-engine ships its ESM build without a "type":"module" marker, so
// depending on the runtime (tsx, vitest, plain node) the library can arrive
// either as a real ESM namespace or as a CJS wrapper with everything under
// `.default`. Unwrap before touching any member.
const AE: typeof AeModule =
  (AeModule as unknown as { default?: typeof AeModule }).default ?? AeModule;
const { Body: AeBody, Ecliptic, EclipticGeoMoon, GeoVector, MakeTime, SiderealTime, SunPosition } = AE;

const AE_BODY: Record<Body, AeModule.Body> = {
  Sun: AeBody.Sun,
  Moon: AeBody.Moon,
  Mercury: AeBody.Mercury,
  Venus: AeBody.Venus,
  Mars: AeBody.Mars,
  Jupiter: AeBody.Jupiter,
  Saturn: AeBody.Saturn,
  Uranus: AeBody.Uranus,
  Neptune: AeBody.Neptune,
  Pluto: AeBody.Pluto,
};

export const BODIES: Body[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

/**
 * Geocentric apparent ecliptic longitude (tropical, true equinox of date).
 * Validated by fixture: Sun longitude ≈ 0° at the instant of the March equinox.
 */
export function eclipticLongitude(body: Body, utc: Date): number {
  const time = MakeTime(utc);
  if (body === "Sun") {
    return norm360(SunPosition(time).elon);
  }
  if (body === "Moon") {
    return norm360(EclipticGeoMoon(time).lon);
  }
  // Planets: geocentric vector (corrected for light travel + aberration),
  // then rotate into true ecliptic of date.
  const vec = GeoVector(AE_BODY[body], time, true);
  return norm360(Ecliptic(vec).elon);
}

/**
 * Retrograde = ecliptic longitude decreasing.
 * Numeric derivative over ±1 hour; robust across the 0°/360° wrap.
 * Sun and Moon are never retrograde geocentrically.
 */
export function isRetrograde(body: Body, utc: Date): boolean {
  if (body === "Sun" || body === "Moon") return false;
  const H = 3600 * 1000;
  const before = eclipticLongitude(body, new Date(utc.getTime() - H));
  const after = eclipticLongitude(body, new Date(utc.getTime() + H));
  return angleDiff(before, after) < 0;
}

/** Mean obliquity of the ecliptic (IAU 2006, Meeus), degrees. */
export function meanObliquity(utc: Date): number {
  const t = (jdTT(utc) - 2451545.0) / 36525;
  return (
    23.43929111111111 -
    (46.8150 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600
  );
}

/** Julian date (TT approximated by UTC; sub-second precision irrelevant here). */
function jdTT(utc: Date): number {
  return utc.getTime() / 86400000 + 2440587.5;
}

/**
 * Local apparent sidereal time in DEGREES at the given longitude (east +).
 * astronomy-engine's SiderealTime returns Greenwich apparent sidereal time in hours.
 */
export function localSiderealTime(utc: Date, longitudeEast: number): number {
  const gastHours = SiderealTime(MakeTime(utc));
  return norm360(gastHours * 15 + longitudeEast);
}
