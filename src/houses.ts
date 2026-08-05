import { DEG, RAD, norm360 } from "./zodiac";

/**
 * House math. All angles in degrees unless suffixed Rad.
 *
 * References: standard textbook formulas (Meeus-style) for MC/Asc from
 * local sidereal time + obliquity; classic iterative semi-arc method for
 * Placidus intermediate cusps.
 */

/** Ecliptic longitude of the Midheaven from RAMC (= LST in degrees). */
export function midheaven(ramc: number, obliquity: number): number {
  const e = obliquity * DEG;
  const r = ramc * DEG;
  // tan λ_MC = tan(RAMC) / cos ε, quadrant-corrected with atan2
  const lon = Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * RAD;
  return norm360(lon);
}

/** Ecliptic longitude of the Ascendant. */
export function ascendant(ramc: number, latitude: number, obliquity: number): number {
  const e = obliquity * DEG;
  const phi = latitude * DEG;
  const r = ramc * DEG;
  const lon =
    Math.atan2(
      Math.cos(r),
      -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e)),
    ) * RAD;
  return norm360(lon);
}

/** Convert a right ascension (deg) on the ecliptic plane to ecliptic longitude. */
function raToEclipticLon(ra: number, obliquity: number): number {
  const e = obliquity * DEG;
  const a = ra * DEG;
  // tan λ = tan α / cos ε  →  λ = atan2(sin α / cos ε, cos α)
  return norm360(Math.atan2(Math.sin(a) / Math.cos(e), Math.cos(a)) * RAD);
}

/**
 * One Placidus intermediate cusp via the classic semi-arc iteration.
 * offset: nominal RA offset from RAMC (30, 60, 120, 150).
 * fractionOfArc / aboveHorizon parameterize which cusp we are solving.
 */
function placidusCusp(
  ramc: number,
  latitude: number,
  obliquity: number,
  offset: 30 | 60 | 120 | 150,
): number {
  const e = obliquity * DEG;
  const phi = latitude * DEG;
  let ra = ramc + offset; // starting guess

  for (let i = 0; i < 100; i++) {
    // Declination of the ecliptic point whose RA is `ra`:
    const decl = Math.atan(Math.sin(ra * DEG) * Math.tan(e));
    // Ascensional difference: sin AD = tan φ · tan δ
    const sinAD = Math.tan(phi) * Math.tan(decl);
    if (sinAD <= -1 || sinAD >= 1) {
      throw new PlacidusUndefinedError();
    }
    const ad = Math.asin(sinAD) * RAD;
    const sda = 90 + ad;  // semi-diurnal arc
    const sna = 90 - ad;  // semi-nocturnal arc

    let next: number;
    if (offset === 30) next = ramc + sda / 3;            // cusp 11
    else if (offset === 60) next = ramc + (2 * sda) / 3; // cusp 12
    else if (offset === 120) next = ramc + 180 - (2 * sna) / 3; // cusp 2
    else next = ramc + 180 - sna / 3;                    // cusp 3

    if (Math.abs(next - ra) < 1e-7) {
      ra = next;
      break;
    }
    ra = next;
  }
  return raToEclipticLon(norm360(ra), obliquity);
}

export class PlacidusUndefinedError extends Error {
  constructor() {
    super("Placidus houses are undefined at this latitude/time");
  }
}

/** All 12 Placidus cusps. Throws PlacidusUndefinedError near/inside polar circles. */
export function placidusCusps(
  ramc: number,
  latitude: number,
  obliquity: number,
): number[] {
  if (Math.abs(latitude) > 66) throw new PlacidusUndefinedError();

  const asc = ascendant(ramc, latitude, obliquity);
  const mc = midheaven(ramc, obliquity);
  const c11 = placidusCusp(ramc, latitude, obliquity, 30);
  const c12 = placidusCusp(ramc, latitude, obliquity, 60);
  const c2 = placidusCusp(ramc, latitude, obliquity, 120);
  const c3 = placidusCusp(ramc, latitude, obliquity, 150);

  const cusps = new Array<number>(12);
  cusps[0] = asc;               // 1
  cusps[1] = c2;                // 2
  cusps[2] = c3;                // 3
  cusps[3] = norm360(mc + 180); // 4 (IC)
  cusps[4] = norm360(c11 + 180);// 5
  cusps[5] = norm360(c12 + 180);// 6
  cusps[6] = norm360(asc + 180);// 7 (Desc)
  cusps[7] = norm360(c2 + 180); // 8
  cusps[8] = norm360(c3 + 180); // 9
  cusps[9] = mc;                // 10
  cusps[10] = c11;              // 11
  cusps[11] = c12;              // 12
  return cusps;
}

/** Whole-sign cusps: house 1 starts at 0° of the Ascendant's sign. */
export function wholeSignCusps(ascLon: number): number[] {
  const start = Math.floor(norm360(ascLon) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(start + i * 30));
}

/** Equal-house cusps: each house is exactly 30° from the Ascendant. */
export function equalCusps(ascLon: number): number[] {
  return Array.from({ length: 12 }, (_, i) => norm360(ascLon + i * 30));
}

/**
 * Which house (1–12) a longitude falls in, given 12 cusps in house order.
 * Works for unequal (Placidus) houses; walks the zodiac from each cusp
 * to the next.
 */
export function houseOf(longitude: number, cusps: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = norm360(b - a);
    const pos = norm360(lon - a);
    if (pos < span || span === 0) {
      if (pos < span) return i + 1;
    }
  }
  // Numerically degenerate fallback (should not happen)
  return 12;
}
