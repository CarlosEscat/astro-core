// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { Dial, DIAL_LINE_MS, DIAL_FLOOR_MS } from "@/components/Dial";
import { DIAL_ES } from "@core/copy/flow.es";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const props = {
  coords: "43,26° N · 2,93° O",
  ciudad: "Bilbao",
  fecha: "28 de julio de 2000",
};

describe("Dial", () => {
  it("fills the first line with the person's own coordinates", () => {
    render(<Dial {...props} />);
    expect(screen.getByText(/43,26° N · 2,93° O/)).toBeTruthy();
  });

  it("advances to the next line, echoing their city and date", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    act(() => { vi.advanceTimersByTime(DIAL_LINE_MS + 10); });
    const line = screen.getByRole("status").textContent!;
    expect(line).toContain("Bilbao");
    expect(line).toContain("28 de julio de 2000");
  });

  // Each tick must be advanced separately: React schedules the NEXT timeout
  // only after the effect re-runs, so one big advanceTimersByTime fires the
  // first timer and nothing else.
  function tick(times: number) {
    for (let n = 0; n < times; n++) {
      act(() => { vi.advanceTimersByTime(DIAL_LINE_MS + 10); });
    }
  }

  it("walks every line in order", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    const seen: string[] = [screen.getByRole("status").textContent!];
    for (let n = 1; n < DIAL_ES.length; n++) {
      tick(1);
      seen.push(screen.getByRole("status").textContent!);
    }
    expect(seen).toHaveLength(DIAL_ES.length);
    expect(new Set(seen).size).toBe(DIAL_ES.length);
    expect(seen[0]).toContain("43,26° N");
    expect(seen.at(-1)).toContain("8.000 cartas");
  });

  // Holding, not looping: past the last line the network really is still
  // working, so holding is the honest thing to show.
  it("holds the last line rather than looping back", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    tick(DIAL_ES.length + 6);
    expect(screen.getByText(/8\.000 cartas/)).toBeTruthy();
    expect(screen.queryByText(/43,26/)).toBeNull();
  });

  it("shows one line at a time", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    act(() => { vi.advanceTimersByTime(DIAL_LINE_MS * 2 + 10); });
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("leaves no placeholder token unreplaced on any line", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    for (let i = 0; i < DIAL_ES.length; i++) {
      expect(screen.getByRole("status").textContent).not.toMatch(/\{\w+\}/);
      tick(1);
    }
  });

  // The floor exists so the beat always plays even though /api/chart returns
  // in ~80ms. Six lines at 750ms is what adds up to it.
  it("runs its lines for at least the floor", () => {
    expect(DIAL_ES.length * DIAL_LINE_MS).toBeGreaterThanOrEqual(DIAL_FLOOR_MS);
  });
});
