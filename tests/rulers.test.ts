import { describe, it, expect } from "vitest";
import {
  SIGN_ORDER, RULER, RULER_TRADITIONAL, ELEMENT, MODALITY,
  signIndex, signSeparation, trineSigns, sextileSigns, squareSigns, oppositeSign,
} from "../src/rulers";

describe("sign tables", () => {
  it("covers all twelve signs in every table", () => {
    expect(SIGN_ORDER).toHaveLength(12);
    for (const sign of SIGN_ORDER) {
      expect(RULER[sign]).toBeDefined();
      expect(RULER_TRADITIONAL[sign]).toBeDefined();
      expect(ELEMENT[sign]).toBeDefined();
      expect(MODALITY[sign]).toBeDefined();
    }
  });

  it("uses modern rulerships as primary", () => {
    expect(RULER.Scorpio).toBe("Pluto");
    expect(RULER.Aquarius).toBe("Uranus");
    expect(RULER.Pisces).toBe("Neptune");
    expect(RULER.Leo).toBe("Sun");
    expect(RULER.Cancer).toBe("Moon");
  });

  it("keeps traditional rulerships available", () => {
    expect(RULER_TRADITIONAL.Scorpio).toBe("Mars");
    expect(RULER_TRADITIONAL.Aquarius).toBe("Saturn");
    expect(RULER_TRADITIONAL.Pisces).toBe("Jupiter");
  });

  it("splits elements and modalities four/three ways", () => {
    const elements = SIGN_ORDER.map((s) => ELEMENT[s]);
    for (const e of ["Fuego", "Tierra", "Aire", "Agua"]) {
      expect(elements.filter((x) => x === e)).toHaveLength(3);
    }
    const modalities = SIGN_ORDER.map((s) => MODALITY[s]);
    for (const m of ["Cardinal", "Fijo", "Mutable"]) {
      expect(modalities.filter((x) => x === m)).toHaveLength(4);
    }
  });
});

describe("sign relations", () => {
  it("indexes signs from Aries", () => {
    expect(signIndex("Aries")).toBe(0);
    expect(signIndex("Pisces")).toBe(11);
  });

  it("measures separation as the short way round", () => {
    expect(signSeparation("Aries", "Libra")).toBe(6);
    expect(signSeparation("Pisces", "Aries")).toBe(1);
    expect(signSeparation("Aries", "Pisces")).toBe(1);
  });

  it("returns two trine signs, always same element", () => {
    const trines = trineSigns("Leo");
    expect(trines).toHaveLength(2);
    expect(new Set(trines)).toEqual(new Set(["Aries", "Sagittarius"]));
    for (const t of trines) expect(ELEMENT[t]).toBe(ELEMENT.Leo);
  });

  it("returns two sextile and two square signs", () => {
    expect(new Set(sextileSigns("Leo"))).toEqual(new Set(["Gemini", "Libra"]));
    expect(new Set(squareSigns("Capricorn"))).toEqual(new Set(["Aries", "Libra"]));
  });

  it("returns the opposite sign", () => {
    expect(oppositeSign("Cancer")).toBe("Capricorn");
    expect(oppositeSign("Capricorn")).toBe("Cancer");
  });

  it("never includes the sign itself in its own relations", () => {
    for (const s of SIGN_ORDER) {
      expect(trineSigns(s)).not.toContain(s);
      expect(sextileSigns(s)).not.toContain(s);
      expect(squareSigns(s)).not.toContain(s);
      expect(oppositeSign(s)).not.toBe(s);
    }
  });
});
