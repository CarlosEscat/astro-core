// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCardShare } from "@/components/CharacterCardShare";
import type { FreeCard } from "@core/card";

afterEach(cleanup);

// Gloss strings are deliberately obvious fixtures, not copy from signs.es.ts —
// this asserts that the component renders whatever it is handed.
const card: FreeCard = {
  clase: { sign: "Leo", nombre: "ARTISTA", signDegree: 7.2, gloss: "glosa del sol" },
  seVe: { sign: "Cancer", signDegree: 12.4, gloss: "glosa del ascendente" },
  porDentro: {
    sign: "Cancer", signDegree: 3.1,
    area: "el dinero y lo tuyo", gloss: "glosa de la luna",
  },
  afinidad: {
    totals: { Fuego: 9.5, Tierra: 2, Aire: 6, Agua: 4 },
    dominant: "Fuego", weakest: "Tierra", total: 21.5,
  },
  rareza: { oneIn: 1728 },
  bloqueado: { rasgos: 3, tensiones: 2, planetas: 7 },
};

describe("CharacterCardShare", () => {
  it("renders at the 9:16 ratio the platforms expect", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 1080 1920");
  });

  it("carries its fonts inside the SVG, so the export is not a system fallback", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    const style = container.querySelector("svg style")?.textContent ?? "";
    expect(style).toContain("@font-face");
    expect(style).toContain("data:font/woff2;base64,");
  });

  it("references nothing external, so the canvas stays untainted", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    const svg = container.querySelector("svg")!.outerHTML;
    expect(svg).not.toMatch(/(href|src)="https?:/);
    expect(svg).not.toMatch(/url\((?!data:)/);
  });

  it("names the class and the signs", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.textContent).toContain("ARTISTA");
    expect(container.textContent).toContain("Cáncer");
  });

  it("shows no house number", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.textContent).not.toMatch(/casa/i);
  });
});
