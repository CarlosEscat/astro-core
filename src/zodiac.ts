import type { Sign } from "./types";

export const SIGNS: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Normalize any angle to [0, 360). */
export function norm360(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Signed shortest distance from a to b in degrees, in (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = norm360(b) - norm360(a);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Unsigned separation between two longitudes, in [0, 180]. */
export function separation(a: number, b: number): number {
  return Math.abs(angleDiff(a, b));
}

export function signOf(longitude: number): Sign {
  return SIGNS[Math.floor(norm360(longitude) / 30) % 12];
}

/** Degree within the sign, [0, 30). */
export function signDegree(longitude: number): number {
  return norm360(longitude) % 30;
}

/** "14°32′ Scorpio" */
export function label(longitude: number): string {
  const sd = signDegree(longitude);
  const deg = Math.floor(sd);
  const min = Math.round((sd - deg) * 60);
  // Handle 59.6' rounding up to 60'
  const [d2, m2] = min === 60 ? [deg + 1, 0] : [deg, min];
  return `${d2}°${String(m2).padStart(2, "0")}′ ${signOf(longitude)}`;
}

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
