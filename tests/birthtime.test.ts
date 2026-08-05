import { describe, it, expect } from "vitest";
import { resolveBirthUtc } from "../src/birthtime";

describe("resolveBirthUtc", () => {
  it("resolves a Madrid summer-time birth (CEST, +2)", () => {
    const r = resolveBirthUtc(
      { year: 1992, month: 4, day: 15, hour: 10, minute: 30 },
      40.4168, -3.7038,
    );
    expect(r.timeZone).toBe("Europe/Madrid");
    expect(r.offsetMinutes).toBe(120);
    expect(r.utc.toISOString()).toBe("1992-04-15T08:30:00.000Z");
  });

  it("resolves a Madrid winter-time birth (CET, +1)", () => {
    const r = resolveBirthUtc(
      { year: 1992, month: 1, day: 15, hour: 10, minute: 30 },
      40.4168, -3.7038,
    );
    expect(r.offsetMinutes).toBe(60);
    expect(r.utc.toISOString()).toBe("1992-01-15T09:30:00.000Z");
  });

  it("resolves a Buenos Aires birth (-3)", () => {
    const r = resolveBirthUtc(
      { year: 1985, month: 11, day: 2, hour: 11, minute: 20 },
      -34.6037, -58.3816,
    );
    expect(r.timeZone).toBe("America/Argentina/Buenos_Aires");
    expect(r.offsetMinutes).toBe(-180);
    expect(r.utc.toISOString()).toBe("1985-11-02T14:20:00.000Z");
  });

  it("uses the HISTORICAL offset, not the current one (Madrid pre-1940 was GMT+0)", () => {
    const r = resolveBirthUtc(
      { year: 1935, month: 1, day: 15, hour: 12, minute: 0 },
      40.4168, -3.7038,
    );
    expect(r.offsetMinutes).toBe(0);
    expect(r.utc.toISOString()).toBe("1935-01-15T12:00:00.000Z");
  });

  it("maps coastal coordinates to the right zone (Bilbao → Europe/Madrid)", () => {
    const r = resolveBirthUtc(
      { year: 2000, month: 7, day: 28, hour: 22, minute: 45 },
      43.263, -2.935,
    );
    expect(r.timeZone).toBe("Europe/Madrid");
    expect(r.utc.toISOString()).toBe("2000-07-28T20:45:00.000Z");
  });

  it("resolves a nonexistent spring-forward time deterministically without throwing", () => {
    // Spain, 1992-03-29: clocks jumped 02:00 → 03:00; 02:30 never existed.
    const r = resolveBirthUtc(
      { year: 1992, month: 3, day: 29, hour: 2, minute: 30 },
      40.4168, -3.7038,
    );
    // Either adjacent reading is acceptable; it must be one of the two.
    expect(["1992-03-29T00:30:00.000Z", "1992-03-29T01:30:00.000Z"])
      .toContain(r.utc.toISOString());
  });
});
