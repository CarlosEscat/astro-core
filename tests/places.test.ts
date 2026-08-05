import { describe, it, expect } from "vitest";
import { searchPlaces } from "../src/places";

describe("searchPlaces", () => {
  it("finds a major Spanish city with region and coordinates", () => {
    const results = searchPlaces("bilb");
    expect(results[0].name).toBe("Bilbao");
    expect(results[0].countryCode).toBe("ES");
    expect(results[0].region).toContain("Vasco");
    expect(results[0].latitude).toBeCloseTo(43.26, 1);
    expect(results[0].longitude).toBeCloseTo(-2.93, 1);
  });

  it("matches accent-insensitively and ranks Spain first", () => {
    const results = searchPlaces("cordoba");
    // Córdoba AR has ~4x the population; the ES market boost must win.
    expect(results[0].countryCode).toBe("ES");
    expect(results[0].name).toBe("Córdoba");
    expect(results.some((r) => r.countryCode === "AR")).toBe(true);
  });

  it("ranks Spanish places above larger non-Spanish ones", () => {
    const results = searchPlaces("santiago");
    const es = results.findIndex((r) => r.countryCode === "ES");
    const cl = results.findIndex((r) => r.countryCode === "CL");
    expect(es).toBeGreaterThanOrEqual(0);
    expect(cl).toBeGreaterThanOrEqual(0);
    expect(es).toBeLessThan(cl);
  });

  it("matches multi-word prefixes", () => {
    const results = searchPlaces("buenos ai");
    expect(results[0].name).toBe("Buenos Aires");
    expect(results[0].countryCode).toBe("AR");
  });

  it("includes small towns (cities500 goes down to ~500 inhabitants)", () => {
    const results = searchPlaces("cadaqu");
    expect(results.some((r) => r.name === "Cadaqués")).toBe(true);
  });

  it("returns nothing for queries under two characters", () => {
    expect(searchPlaces("b")).toEqual([]);
    expect(searchPlaces("")).toEqual([]);
  });

  it("caps results at the requested limit", () => {
    expect(searchPlaces("san", 5)).toHaveLength(5);
  });
});
