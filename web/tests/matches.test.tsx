// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Matches } from "@/components/Matches";
import type { Match } from "@/components/types";

afterEach(cleanup);

const friction: Match = { sign: "Capricorn", say: "roce", why: "por qué" };
const airMatches: Match[] = [
  { sign: "Gemini", say: "encaje aire", why: "por qué" },
  { sign: "Libra", say: "otro aire", why: "por qué" },
];
// One water sign, one air sign — exactly one match shares "Agua", the real
// boundary for the >= 2 threshold (a >= 1 bug would wrongly fire here).
const oneWaterMatch: Match[] = [
  { sign: "Cancer", say: "encaje agua", why: "por qué" },
  { sign: "Gemini", say: "encaje aire", why: "por qué" },
];

describe("Matches", () => {
  it("lists the matches and the friction sign", () => {
    const { container } = render(
      <Matches matches={airMatches} friction={friction} weakest="Aire" />,
    );
    expect(container.textContent).toContain("Géminis");
    expect(container.textContent).toContain("Capricornio");
  });

  it("names the pattern when two matches share the reader's weakest element", () => {
    const { container } = render(
      <Matches matches={airMatches} friction={friction} weakest="Aire" />,
    );
    expect(container.textContent).toContain("Buscas fuera lo que no llevas dentro");
  });

  it("stays quiet when only one match shares the weakest element", () => {
    const { container } = render(
      <Matches matches={oneWaterMatch} friction={friction} weakest="Agua" />,
    );
    expect(container.textContent).not.toContain("Buscas fuera");
  });
});
