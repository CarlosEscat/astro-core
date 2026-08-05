import type {
  BirthMoment, NatalChart, PlanetPosition, HouseCusp, Body, HouseSystem,
} from "./types";
import {
  BODIES, eclipticLongitude, isRetrograde, meanObliquity, localSiderealTime,
} from "./ephemeris";
import {
  placidusCusps, wholeSignCusps, equalCusps, ascendant, midheaven,
  houseOf, PlacidusUndefinedError,
} from "./houses";
import { detectAspects } from "./aspects";
import { signOf, signDegree, label, norm360 } from "./zodiac";

export interface ChartOptions {
  /** Preferred house system; defaults to Placidus (standard in Spain). */
  houseSystem?: HouseSystem;
}

function cusp(house: number, longitude: number): HouseCusp {
  return {
    house,
    longitude: round4(longitude),
    sign: signOf(longitude),
    signDegree: round4(signDegree(longitude)),
    label: label(longitude),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeNatalChart(
  birth: BirthMoment,
  options: ChartOptions = {},
): NatalChart {
  validate(birth);
  const requested: HouseSystem = options.houseSystem ?? "placidus";

  const obliquity = meanObliquity(birth.utc);
  const lst = localSiderealTime(birth.utc, birth.longitude);
  const ascLon = ascendant(lst, birth.latitude, obliquity);

  // House cusps, with graceful degradation at extreme latitudes.
  let cusps: number[];
  let system: HouseSystem = requested;
  let fallback = false;
  try {
    cusps =
      requested === "placidus" ? placidusCusps(lst, birth.latitude, obliquity)
      : requested === "equal" ? equalCusps(ascLon)
      : wholeSignCusps(ascLon);
  } catch (e) {
    if (e instanceof PlacidusUndefinedError) {
      cusps = wholeSignCusps(ascLon);
      system = "whole-sign";
      fallback = true;
    } else {
      throw e;
    }
  }

  // Planet positions.
  const positions = new Map<Body, number>();
  for (const b of BODIES) positions.set(b, eclipticLongitude(b, birth.utc));

  const planets: PlanetPosition[] = BODIES.map((b) => {
    const lon = positions.get(b)!;
    return {
      body: b,
      longitude: round4(lon),
      sign: signOf(lon),
      signDegree: round4(signDegree(lon)),
      label: label(lon),
      retrograde: isRetrograde(b, birth.utc),
      house: houseOf(lon, cusps),
    };
  });

  const mcLon = midheaven(lst, obliquity);

  return {
    houseSystem: system,
    houseSystemFallback: fallback,
    planets,
    houses: cusps.map((lon, i) => cusp(i + 1, lon)),
    angles: {
      ascendant: cusp(1, ascLon),
      midheaven: cusp(10, mcLon),
      descendant: cusp(7, norm360(ascLon + 180)),
      imumCoeli: cusp(4, norm360(mcLon + 180)),
    },
    aspects: detectAspects(positions, birth.utc),
    obliquity: round4(obliquity),
    siderealTime: round4(lst),
  };
}

function validate(b: BirthMoment): void {
  if (!(b.utc instanceof Date) || isNaN(b.utc.getTime())) {
    throw new Error("BirthMoment.utc must be a valid Date");
  }
  if (b.latitude < -90 || b.latitude > 90) {
    throw new Error("latitude must be in [-90, 90]");
  }
  if (b.longitude < -180 || b.longitude > 180) {
    throw new Error("longitude must be in [-180, 180] (east positive)");
  }
  const year = b.utc.getUTCFullYear();
  if (year < 1900 || year > 2100) {
    throw new Error("birth year must be between 1900 and 2100");
  }
}

export * from "./types";
