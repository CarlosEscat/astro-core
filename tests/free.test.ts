import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildFreeMessages, parseFree } from "../src/report";
import { validateFree } from "../src/validate";

const { utc } = resolveBirthUtc({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const bilbao = computeNatalChart({ utc, latitude: 43.263, longitude: -2.935 });

describe("buildFreeMessages", () => {
  it("sends exactly one chosen feature, not a menu", () => {
    const user = buildFreeMessages({ chart: bilbao })[1].content;
    const payload = JSON.parse(user.match(/rasgo:\n(\{[\s\S]*?\})\n\n/)![1]);
    expect(payload).toBeTruthy();
    expect(Array.isArray(payload)).toBe(false);
  });

  // Scoped to the user message on purpose. The system prompt names the banned
  // vocabulary in order to ban it; what must never carry jargon is the DATA,
  // because the model cannot write a house number it was never given.
  it("never leaks house numbers, degrees or aspect names to the model", () => {
    const user = buildFreeMessages({ chart: bilbao })[1].content;
    expect(user).not.toMatch(/"house"/);
    expect(user).not.toMatch(/casa\s*\d/i);
    expect(user).not.toMatch(/"degree"/);
    expect(user).not.toMatch(/tr[íi]gono|sextil|cuadratura|"conjunction"|"opposition"/i);
  });

  it("carries no PII beyond a sanitized first name", () => {
    const all = buildFreeMessages({ chart: bilbao, firstName: "Lucía" })
      .map((m) => m.content).join("\n");
    expect(all).toContain("Lucía");
    expect(all).not.toContain("2000");
    expect(all).not.toContain("43.26");
  });

  it("stays small — the prompt dominates cost", () => {
    const user = buildFreeMessages({ chart: bilbao })[1].content;
    expect(user.length).toBeLessThan(3000);
  });
});

describe("parseFree", () => {
  const good = "## APERTURA\n\nTexto de apertura.\n\n## AMOR\n\nLa frase gancho.\n\nY el desarrollo.";

  it("splits the two blocks", () => {
    const r = parseFree(good)!;
    expect(r.apertura).toBe("Texto de apertura.");
    expect(r.amor).toContain("La frase gancho.");
  });

  it("pulls the hook out as the first line of the love block", () => {
    expect(parseFree(good)!.hook).toBe("La frase gancho.");
  });

  // Observed on the live battery: the model often returns the love block as a
  // single unbroken paragraph. Taking the first LINE then hands the UI the
  // whole block as a display quote and leaves the body empty.
  it("takes the first sentence when the block is one paragraph", () => {
    const oneParagraph =
      "## APERTURA\n\nA.\n\n## AMOR\n\nQuieres fuegos pero pones orden. " +
      "Y luego te quejas de lo mismo. Y vuelta a empezar.";
    expect(parseFree(oneParagraph)!.hook).toBe("Quieres fuegos pero pones orden.");
  });

  it("returns null when the model breaks the structure", () => {
    expect(parseFree("Sin encabezados")).toBeNull();
    expect(parseFree("## APERTURA\n\nSolo una parte.")).toBeNull();
  });

  it("tolerates a single hash and stray whitespace", () => {
    expect(parseFree("# APERTURA\n\nA.\n\n#  AMOR \n\nB.")).not.toBeNull();
  });
});

describe("validateFree", () => {
  it("checks each block against its own word range", () => {
    const short = { apertura: "corto", amor: "corto", hook: "corto" };
    const v = validateFree(short, bilbao);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toContain("apertura");
    expect(v.problems.join(" ")).toContain("amor");
  });

  it("rejects jargon in either block", () => {
    const words = (n: number) => Array(n).fill("palabra").join(" ");
    const bad = {
      apertura: `${words(120)} con una conjunción exacta`,
      amor: words(90),
      hook: "gancho",
    };
    expect(validateFree(bad, bilbao).ok).toBe(false);
  });
});
