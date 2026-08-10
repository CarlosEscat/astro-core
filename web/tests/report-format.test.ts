import { describe, it, expect } from "vitest";
import { paragraphsOf, readingMinutes, slugify } from "@/lib/report-format";

describe("paragraphsOf", () => {
  it("splits on blank lines", () => {
    expect(paragraphsOf("Uno.\n\nDos.\n\nTres.")).toEqual(["Uno.", "Dos.", "Tres."]);
  });

  it("tolerates the extra blank lines models emit", () => {
    expect(paragraphsOf("Uno.\n\n\n\nDos.")).toEqual(["Uno.", "Dos."]);
  });

  it("treats a single unbroken block as one paragraph", () => {
    expect(paragraphsOf("Una sola parrafada larga.")).toHaveLength(1);
  });

  it("trims and drops empties rather than rendering blank <p>", () => {
    expect(paragraphsOf("\n\n  Uno.  \n\n\n")).toEqual(["Uno."]);
    expect(paragraphsOf("   ")).toEqual([]);
  });

  // The section prompt forbids lists and bold, so a stray "## " means the
  // model emitted a heading composeReport failed to strip. Render it as prose
  // rather than swallowing it — silently dropping text is worse than showing it.
  it("keeps stray markdown as literal text", () => {
    expect(paragraphsOf("## Título\n\nCuerpo.")).toEqual(["## Título", "Cuerpo."]);
  });
});

describe("readingMinutes", () => {
  // ~200 wpm is the standard for prose in a first language.
  it("rounds up to whole minutes", () => {
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(3000)).toBe(15);
  });

  it("never claims zero minutes", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(10)).toBe(1);
  });
});

describe("slugify", () => {
  it("makes an anchor id from a Spanish heading", () => {
    expect(slugify("Amor y vínculos")).toBe("amor-y-vinculos");
    expect(slugify("Tu retrato esencial")).toBe("tu-retrato-esencial");
  });

  it("strips accents rather than emitting them into an id", () => {
    expect(slugify("Vocación y propósito")).toBe("vocacion-y-proposito");
  });

  it("is stable and collision-free across the eight real titles", () => {
    const titles = [
      "Tu retrato esencial", "El corazón de tu identidad", "Tu mundo emocional",
      "La puerta por la que entras al mundo", "Amor y vínculos",
      "Vocación y propósito", "Tus luces y tus sombras", "Claves para tu camino",
    ];
    const slugs = titles.map(slugify);
    expect(new Set(slugs).size).toBe(8);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});
