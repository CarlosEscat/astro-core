import { describe, it, expect } from "vitest";
import { composeReport, parseReport, SECTION_TITLES } from "../src/report";

const body = (n: number) => `Cuerpo ${n}. ` + "palabra ".repeat(60) + "final.";
const bodies = () => SECTION_TITLES.map((_, i) => body(i));

describe("composeReport", () => {
  it("round-trips through parseReport", () => {
    const parsed = parseReport(composeReport(bodies()));
    expect(parsed).not.toBeNull();
    expect(parsed!.sections).toHaveLength(8);
    expect(parsed!.sections.map((s) => s.title)).toEqual([...SECTION_TITLES]);
    expect(parsed!.sections[3].body).toContain("Cuerpo 3.");
  });

  it("emits each title exactly once as a level-two heading", () => {
    const md = composeReport(bodies());
    for (const title of SECTION_TITLES) {
      expect(md.match(new RegExp(`^## ${title}$`, "gm"))).toHaveLength(1);
    }
  });

  it("strips a heading the model emitted despite being told not to", () => {
    const withHeading = bodies();
    withHeading[0] = `## ${SECTION_TITLES[0]}\n\n${withHeading[0]}`;
    const md = composeReport(withHeading);
    expect(md.match(new RegExp(`^## ${SECTION_TITLES[0]}$`, "gm"))).toHaveLength(1);
    expect(parseReport(md)).not.toBeNull();
  });

  it("rejects the wrong number of sections", () => {
    expect(() => composeReport(["solo una"])).toThrow();
  });
});
