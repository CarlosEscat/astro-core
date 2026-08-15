import { describe, it, expect } from "vitest";
import { SECTION_BRIEFS, briefFor } from "../src/sections";
import { SECTION_TITLES } from "../src/report";

describe("section briefs", () => {
  it("has one brief per report section, in order", () => {
    expect(SECTION_BRIEFS).toHaveLength(8);
    expect(SECTION_BRIEFS.map((b) => b.title)).toEqual([...SECTION_TITLES]);
    expect(SECTION_BRIEFS.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("gives every section a sane word range", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.minWords).toBeGreaterThan(0);
      expect(b.maxWords).toBeGreaterThan(b.minWords);
      expect(b.brief.length).toBeGreaterThan(80);
    }
  });

  // The 300-350 this section used to carry was never achievable: it asks for
  // four distinct beats, and it overshot on every chart and every model both
  // here (348-563 on the 2026-08-10 battery) and under the old single-call
  // architecture (367-454, Addendum 8). The range now says what four beats
  // actually cost.
  it("grows the love section under the amor focus", () => {
    expect(briefFor(4).maxWords).toBe(480);
    expect(briefFor(4, "amor").maxWords).toBe(600);
    expect(briefFor(4, "trabajo").maxWords).toBe(480);
  });

  it("grows the vocation section under the trabajo focus", () => {
    expect(briefFor(5, "trabajo").maxWords).toBe(450);
    expect(briefFor(5, "amor").maxWords).toBe(350);
  });

  it("rejects an out-of-range index", () => {
    expect(() => briefFor(8)).toThrow();
    expect(() => briefFor(-1)).toThrow();
  });

  // The model must never be told to write its own heading: composeReport
  // adds it, and a duplicated heading breaks parseReport.
  it("never instructs the model to emit a heading", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.brief).not.toContain("##");
    }
  });
});

describe("the briefs are written in the plain register", () => {
  it("uses no technical vocabulary and no numbered houses", () => {
    const banned = ["conjunción", "oposición", "cuadratura", "trígono", "sextil",
                    "aspecto", "orbe", "regente", "retrógrado", "cúspide"];
    for (const b of SECTION_BRIEFS) {
      const text = b.brief.toLowerCase();
      for (const word of banned) {
        expect(text, `${b.title} contiene "${word}"`).not.toContain(word);
      }
      expect(text, `${b.title} numera una casa`).not.toMatch(/casas?\s+(?:\d|un[ao]|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)/u);
    }
  });

  it("stops telling the model there is a JSON to read", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.brief.toLowerCase()).not.toContain("json");
    }
  });

  it("keeps the love section's four beats", () => {
    const amor = SECTION_BRIEFS[4].brief;
    expect(amor).toMatch(/patrón/i);
    expect(amor).toMatch(/intimidad|soltar/i);
    expect(amor).toMatch(/agencia|se trabaja/i);
  });
});

describe("every section declares a paragraph range", () => {
  it("gives each section a sane range", () => {
    for (const b of SECTION_BRIEFS) {
      const [lo, hi] = b.paragraphs;
      expect(lo, `${b.title}`).toBeGreaterThanOrEqual(2);
      expect(hi, `${b.title}`).toBeGreaterThanOrEqual(lo);
    }
  });

  // The defect this fixes: a 286-word section delivered as ONE paragraph
  // (Addendum 13). A floor of 2 is what makes that unrepresentable.
  it("never lets a section be one block", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.paragraphs[0], `${b.title} admite un solo párrafo`).toBeGreaterThan(1);
    }
  });

  // Set against OBSERVED lengths, not nominal: sections overshoot by ~30%
  // (Addenda 7, 8, 12), so dividing maxWords would under-deliver paragraphs.
  it("keeps paragraphs inside a readable band even when the section overruns", () => {
    for (const b of SECTION_BRIEFS) {
      const overrun = b.maxWords * 1.3;         // what the model actually writes
      const worst = overrun / b.paragraphs[0];  // fewest paragraphs allowed
      expect(worst, `${b.title} permite un párrafo de ${Math.round(worst)} palabras`)
        .toBeLessThanOrEqual(170);
    }
  });

  it("scales the paragraph range when a focus grows the section", () => {
    const amor = briefFor(4, "amor");
    expect(amor.maxWords).toBe(600);
    expect(amor.paragraphs).toEqual(SECTION_BRIEFS[4].grownParagraphs);
    expect(amor.paragraphs[1]).toBeGreaterThan(SECTION_BRIEFS[4].paragraphs[1]);
  });
});
