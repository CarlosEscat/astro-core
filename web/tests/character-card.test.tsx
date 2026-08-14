// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCardView } from "@/components/CharacterCard";
import { formatDegree } from "@/lib/format";
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

describe("CharacterCardView", () => {
  it("names the class", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("ARTISTA");
  });

  it("names the signs in Spanish", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("Cáncer");
  });

  it("shows the life area, never a house number", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("el dinero y lo tuyo");
    expect(container.textContent).not.toMatch(/casa/i);
    expect(container.textContent).not.toMatch(/\bcasa\s*\d/i);
  });

  it("renders all three glosses, which Readout used to carry", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("glosa del sol");
    expect(container.textContent).toContain("glosa del ascendente");
    expect(container.textContent).toContain("glosa de la luna");
  });

  it("renders a degree per row, formatted as Readout formatted it", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain(formatDegree(12.4));
  });

  it("renders the element distribution with its real totals", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("9,5");
    expect(container.textContent).toContain("Fuego");
  });

  it("renders the locked blocks with their real counts", () => {
    const { container } = render(<CharacterCardView card={card} />);
    const locked = container.querySelectorAll("[data-locked]");
    expect(locked.length).toBe(3);
    expect(container.textContent).toContain("3 rasgos");
    expect(container.textContent).toContain("2 tensiones");
  });

  it("states the rarity formatted for es-ES", () => {
    const { container } = render(<CharacterCardView card={card} />);
    // es-ES does not group four-digit numbers (CLDR minimumGroupingDigits: 2).
    expect(container.textContent).toContain("1728");
  });

  it("names the reader when a first name is given", () => {
    const { container } = render(<CharacterCardView card={card} firstName="Alex" />);
    expect(container.textContent).toContain("Alex");
  });

  it("omits the name line entirely without one", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.querySelector("[data-name]")).toBeNull();
  });
});
