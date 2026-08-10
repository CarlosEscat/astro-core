// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ShareCard } from "@/components/ShareCard";

afterEach(cleanup);

const sig = { sun: "Leo", moon: "Cancer", ascendant: "Cancer", oneIn: 1728 } as const;

describe("ShareCard", () => {
  it("renders at the 9:16 ratio the platforms expect", () => {
    const { container } = render(<ShareCard sig={sig} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1080 1920");
  });

  it("names the big three in Spanish", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("Leo");
    expect(container.textContent).toContain("Cáncer");
  });

  // es-ES does not group four-digit numbers (CLDR minimumGroupingDigits: 2),
  // so 1728 is "1728" and only five digits and up take the point separator.
  // Both cases are asserted because the interesting half is the grouping.
  it("states the computed rarity, formatted for es-ES", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("1728");
  });

  it("groups the separator the Spanish way once the number is big enough", () => {
    const { container } = render(<ShareCard sig={{ ...sig, oneIn: 17280 }} />);
    expect(container.textContent).toContain("17.280");
  });

  // Addendum 5: without U+FE0E these render as colour emoji on Apple
  // platforms, which destroys the engraved look on exactly the devices the
  // card is shared from.
  it("carries the text-presentation selector on every glyph", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("︎");
  });

  it("offers a share affordance", () => {
    render(<ShareCard sig={sig} />);
    expect(screen.getByRole("button", { name: /compartir|guardar/i })).toBeDefined();
  });

  // The copy is hand-written, so it is held to the same standard as LLM
  // output — Addendum 6 records a gendered heading shipping in the prototype.
  it("uses no gendered phrasing", () => {
    const { container } = render(<ShareCard sig={sig} firstName="Lucía" />);
    expect(container.textContent).not.toMatch(/\b(nacida|nacido|preparada|preparado)\b/i);
  });
});
