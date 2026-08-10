// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReportView } from "@/components/ReportView";
import { ReportIndex } from "@/components/ReportIndex";

afterEach(cleanup);

const sections = [
  { title: "Tu retrato esencial", body: "Primer párrafo.\n\nSegundo párrafo." },
  { title: "El corazón de tu identidad", body: "Cuerpo dos." },
  { title: "Amor y vínculos", body: "Cuerpo tres." },
];

describe("ReportView", () => {
  it("renders every section title as a heading", () => {
    render(<ReportView sections={sections} />);
    for (const s of sections) {
      expect(screen.getByRole("heading", { name: s.title })).toBeDefined();
    }
  });

  it("renders each paragraph separately rather than one block", () => {
    const { container } = render(<ReportView sections={sections} />);
    const first = container.querySelector("section");
    expect(first?.querySelectorAll("p")).toHaveLength(2);
  });

  it("gives each section an anchor id matching its slug", () => {
    const { container } = render(<ReportView sections={sections} />);
    expect(container.querySelector("#amor-y-vinculos")).not.toBeNull();
  });

  it("greets by first name when there is one, and omits it otherwise", () => {
    const { unmount } = render(<ReportView sections={sections} firstName="Lucía" />);
    expect(screen.getByText(/Lucía/)).toBeDefined();
    unmount();
    render(<ReportView sections={sections} />);
    expect(screen.queryByText(/Lucía/)).toBeNull();
  });

  // Progressive rendering (Task 6) hands this component a partial array.
  // It must be a normal state, not a crash or an empty page.
  it("renders a partial report without complaining", () => {
    const { container } = render(<ReportView sections={sections.slice(0, 1)} />);
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });

  it("renders nothing rather than throwing when given no sections", () => {
    const { container } = render(<ReportView sections={[]} />);
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });

  // The prompt bans markup, so any that arrives is a model slip. It must show
  // as text — never be injected as HTML.
  it("does not interpret markup in a body as HTML", () => {
    const hostile = [{ title: "Tu retrato esencial", body: "<img src=x onerror=alert(1)>" }];
    const { container } = render(<ReportView sections={hostile} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img/)).toBeDefined();
  });
});

describe("ReportIndex", () => {
  it("links to every section", () => {
    render(<ReportIndex sections={sections} />);
    const link = screen.getByRole("link", { name: "Amor y vínculos" });
    expect(link.getAttribute("href")).toBe("#amor-y-vinculos");
  });

  it("numbers the sections", () => {
    const { container } = render(<ReportIndex sections={sections} />);
    expect(container.textContent).toContain("01");
    expect(container.textContent).toContain("03");
  });
});
