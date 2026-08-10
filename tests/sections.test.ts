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
