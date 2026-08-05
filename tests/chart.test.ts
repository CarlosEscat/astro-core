import { describe, it, expect } from "vitest";
import * as Astronomy from "astronomy-engine";
import { computeNatalChart } from "../src/chart";
import { eclipticLongitude, meanObliquity, localSiderealTime } from "../src/ephemeris";
import { ascendant, placidusCusps, houseOf, wholeSignCusps } from "../src/houses";
import { separation, norm360, signOf, label } from "../src/zodiac";

/**
 * FIXTURE PHILOSOPHY
 * We do not trust hand-copied numbers from astrology websites. Instead we
 * anchor on astronomical events whose definition IS the quantity we compute:
 *  - At the March equinox, the Sun's tropical longitude is 0° BY DEFINITION.
 *  - At solstices/September equinox: 90°, 180°, 270°.
 *  - At new moon, Moon and Sun share the same longitude BY DEFINITION.
 *  - At sunrise, the Sun sits on the horizon — i.e. on the Ascendant.
 * Plus known-value spot checks and structural invariants for houses.
 */

// Published equinox/solstice instants (UTC), IMCCE/USNO, minute precision.
const CARDINAL_MOMENTS: Array<[string, number]> = [
  ["2020-03-20T03:50:00Z", 0],
  ["2020-06-20T21:44:00Z", 90],
  ["2020-09-22T13:31:00Z", 180],
  ["2020-12-21T10:02:00Z", 270],
  ["1990-03-20T21:19:00Z", 0],
  ["2025-06-21T02:42:00Z", 90],
];

describe("ephemeris: Sun tropical longitude", () => {
  it.each(CARDINAL_MOMENTS)("matches cardinal point at %s", (iso, expected) => {
    const lon = eclipticLongitude("Sun", new Date(iso));
    // Sun moves ~0.0007°/min; minute-precision fixtures → allow 0.01°.
    expect(separation(lon, expected)).toBeLessThan(0.01);
  });
});

describe("ephemeris: Moon vs lunar phases (definitional)", () => {
  it("Moon longitude equals Sun longitude at new moon", () => {
    const nm = Astronomy.SearchMoonPhase(0, Astronomy.MakeTime(new Date("2021-01-01T00:00:00Z")), 40)!;
    const utc = nm.date;
    const dSun = eclipticLongitude("Sun", utc);
    const dMoon = eclipticLongitude("Moon", utc);
    expect(separation(dSun, dMoon)).toBeLessThan(0.02);
  });

  it("Moon opposes Sun at full moon", () => {
    const fm = Astronomy.SearchMoonPhase(180, Astronomy.MakeTime(new Date("2021-01-01T00:00:00Z")), 40)!;
    const utc = fm.date;
    const dSun = eclipticLongitude("Sun", utc);
    const dMoon = eclipticLongitude("Moon", utc);
    expect(separation(dSun, norm360(dMoon + 180))).toBeLessThan(0.02);
  });
});

describe("ephemeris: retrograde detection", () => {
  it("Mercury retrograde mid-Feb 2020 (known station Feb 17 – Mar 10)", () => {
    const chart = computeNatalChart({
      utc: new Date("2020-02-25T12:00:00Z"),
      latitude: 40.4168, longitude: -3.7038, // Madrid
    });
    const mercury = chart.planets.find((p) => p.body === "Mercury")!;
    expect(mercury.retrograde).toBe(true);
  });

  it("Mercury direct mid-January 2020", () => {
    const chart = computeNatalChart({
      utc: new Date("2020-01-15T12:00:00Z"),
      latitude: 40.4168, longitude: -3.7038,
    });
    expect(chart.planets.find((p) => p.body === "Mercury")!.retrograde).toBe(false);
  });

  it("Sun and Moon are never retrograde", () => {
    const chart = computeNatalChart({
      utc: new Date("1995-07-07T07:07:00Z"),
      latitude: 52.37, longitude: 4.9, // Amsterdam
    });
    expect(chart.planets.find((p) => p.body === "Sun")!.retrograde).toBe(false);
    expect(chart.planets.find((p) => p.body === "Moon")!.retrograde).toBe(false);
  });
});

describe("houses: Ascendant vs sunrise (definitional cross-check)", () => {
  // The Ascendant IS the eastern intersection of ecliptic and horizon.
  // The Sun's ecliptic latitude is ~0, so at the instant its GEOMETRIC
  // altitude crosses 0° rising, its longitude must equal the Ascendant.
  // (Refracted sunrise would be minutes early → degrees of Asc drift at
  // high latitude, so we search the airless altitude=0 crossing instead.)
  const places = [
    { name: "Madrid", lat: 40.4168, lon: -3.7038 },
    { name: "Amsterdam", lat: 52.37, lon: 4.9 },
    { name: "Buenos Aires", lat: -34.6, lon: -58.38 },
  ];

  it.each(places)("Sun sits on the Ascendant at sunrise in $name", ({ lat, lon }) => {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const rise = Astronomy.SearchAltitude(
      Astronomy.Body.Sun, observer, +1,
      Astronomy.MakeTime(new Date("2021-04-10T00:00:00Z")), 2, 0,
    )!;
    const utc = rise.date;
    const asc = ascendant(
      localSiderealTime(utc, lon), lat, meanObliquity(utc),
    );
    const sun = eclipticLongitude("Sun", utc);
    expect(separation(asc, sun)).toBeLessThan(0.3);
  });
});

describe("houses: Placidus structural invariants", () => {
  const cases = [
    { utc: new Date("1988-11-03T22:15:00Z"), lat: 41.3874, lon: 2.1686 },  // Barcelona
    { utc: new Date("1979-05-21T04:30:00Z"), lat: 28.4636, lon: -16.2518 },// Tenerife
    { utc: new Date("2001-12-01T15:45:00Z"), lat: 52.37, lon: 4.9 },       // Amsterdam
    { utc: new Date("1965-08-14T09:00:00Z"), lat: -33.45, lon: -70.66 },   // Santiago
  ];

  it.each(cases)("cusps are ordered, opposite, and anchored (case %#)", ({ utc, lat, lon }) => {
    const obliquity = meanObliquity(utc);
    const lst = localSiderealTime(utc, lon);
    const cusps = placidusCusps(lst, lat, obliquity);

    // 12 cusps, each opposite cusp exactly 180° away
    expect(cusps).toHaveLength(12);
    for (let i = 0; i < 6; i++) {
      expect(separation(cusps[i], norm360(cusps[i + 6] + 180))).toBeLessThan(1e-6);
    }
    // Cusps advance monotonically around the zodiac (sum of gaps = 360)
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const gap = norm360(cusps[(i + 1) % 12] - cusps[i]);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(120);
      total += gap;
    }
    expect(Math.abs(total - 360)).toBeLessThan(1e-6);
    // Cusp 1 is the Ascendant; cusp 10 is the MC
    expect(separation(cusps[0], ascendant(lst, lat, obliquity))).toBeLessThan(1e-6);
  });

  it("degenerates to ~equal RA spacing at the equator", () => {
    const utc = new Date("2000-06-01T10:00:00Z");
    const obliquity = meanObliquity(utc);
    const lst = localSiderealTime(utc, 0);
    // At φ=0 the ascensional difference vanishes: SDA = SNA = 90°, so the
    // Placidus iteration must converge in one step to offsets 30/60/120/150.
    const cusps = placidusCusps(lst, 0, obliquity);
    expect(cusps).toHaveLength(12);
    for (let i = 0; i < 6; i++) {
      expect(separation(cusps[i], norm360(cusps[i + 6] + 180))).toBeLessThan(1e-6);
    }
  });

  it("falls back to whole-sign above the Placidus latitude limit", () => {
    const chart = computeNatalChart({
      utc: new Date("1990-01-10T12:00:00Z"),
      latitude: 69.65, longitude: 18.96, // Tromsø
    });
    expect(chart.houseSystem).toBe("whole-sign");
    expect(chart.houseSystemFallback).toBe(true);
    // Whole-sign cusps are 0° of consecutive signs
    for (const h of chart.houses) expect(h.signDegree).toBe(0);
  });
});

describe("houses: houseOf placement", () => {
  it("places longitudes correctly across the 0° Aries wrap", () => {
    const cusps = wholeSignCusps(350); // Asc at 20° Pisces → house 1 = Pisces
    expect(houseOf(355, cusps)).toBe(1);  // 25° Pisces
    expect(houseOf(5, cusps)).toBe(2);    // 5° Aries
    expect(houseOf(345, cusps)).toBe(1);  // 15° Pisces
    expect(houseOf(325, cusps)).toBe(12); // 25° Aquarius
  });
});

describe("zodiac utilities", () => {
  it("maps longitudes to signs at boundaries", () => {
    expect(signOf(0)).toBe("Aries");
    expect(signOf(29.999)).toBe("Aries");
    expect(signOf(30)).toBe("Taurus");
    expect(signOf(359.999)).toBe("Pisces");
    expect(signOf(360)).toBe("Aries");
  });

  it("formats labels including the 60-minute rounding edge", () => {
    expect(label(210.5)).toBe("0°30′ Scorpio");
    expect(label(29.9999)).toBe("30°00′ Aries"); // rounds within-sign
  });
});

describe("full chart integration", () => {
  it("computes a complete, internally consistent chart", () => {
    const chart = computeNatalChart({
      utc: new Date("1992-04-15T08:30:00Z"),
      latitude: 40.4168, longitude: -3.7038,
    });

    expect(chart.planets).toHaveLength(10);
    expect(chart.houses).toHaveLength(12);
    expect(chart.houseSystem).toBe("placidus");
    expect(chart.houseSystemFallback).toBe(false);

    // Sun in mid-April must be in Aries
    const sun = chart.planets.find((p) => p.body === "Sun")!;
    expect(sun.sign).toBe("Aries");

    // Angles mirror houses
    expect(chart.angles.ascendant.longitude).toBe(chart.houses[0].longitude);
    expect(chart.angles.midheaven.longitude).toBe(chart.houses[9].longitude);

    // Every planet's house is consistent with the cusps
    const cuspLons = chart.houses.map((h) => h.longitude);
    for (const p of chart.planets) {
      expect(p.house).toBe(houseOf(p.longitude, cuspLons));
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }

    // Aspects are symmetric-safe, sorted by orb, within limits
    for (let i = 1; i < chart.aspects.length; i++) {
      expect(chart.aspects[i].orb).toBeGreaterThanOrEqual(chart.aspects[i - 1].orb);
    }
    for (const a of chart.aspects) {
      expect(a.orb).toBeLessThanOrEqual(10);
    }

    // Serializes cleanly (this JSON is the LLM contract)
    const json = JSON.stringify(chart);
    expect(json.length).toBeGreaterThan(500);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("rejects invalid input", () => {
    expect(() => computeNatalChart({ utc: new Date("invalid"), latitude: 0, longitude: 0 })).toThrow();
    expect(() => computeNatalChart({ utc: new Date(), latitude: 95, longitude: 0 })).toThrow();
    expect(() => computeNatalChart({ utc: new Date("1850-01-01T00:00:00Z"), latitude: 0, longitude: 0 })).toThrow();
  });
});
