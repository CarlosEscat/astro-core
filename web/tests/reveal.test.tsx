// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { Reveal, formatCoords, formatFecha } from "@/components/Reveal";
import { STORAGE_KEY } from "@/hooks/useBirthAnswers";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const answers = {
  firstName: "Carlos",
  date: "2000-07-28",
  time: "22:45",
  hourKnown: true,
  place: {
    name: "Bilbao", region: "País Vasco", countryCode: "ES",
    latitude: 43.263, longitude: -2.935,
  },
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
});

/** Minimal chart payload — enough for Reading to render without throwing. */
const chart = {
  timeZone: "Europe/Madrid",
  bigThree: {
    sun: { sign: "Leo", degree: 5, gloss: "g" },
    moon: { sign: "Pisces", degree: 5, gloss: "g" },
    ascendant: { sign: "Pisces", degree: 5, gloss: "g" },
  },
  matches: [], friction: { sign: "Leo", say: "s", why: "w" },
  elements: { totals: { Fuego: 1, Tierra: 1, Aire: 1, Agua: 1 }, dominant: "Fuego", weakest: "Agua", total: 4 },
  ruler: { body: "Jupiter", sign: "Leo", inDomicile: false },
  signature: { sun: "Leo", moon: "Pisces", ascendant: "Pisces", oneIn: 1728 },
  card: {
    clase: { sign: "Leo", nombre: "ARTISTA", signDegree: 5, gloss: "g" },
    seVe: { sign: "Pisces", signDegree: 5, gloss: "g", approximate: false },
    porDentro: { sign: "Pisces", signDegree: 5, area: "a", gloss: "g" },
    afinidad: { totals: { Fuego: 1, Tierra: 1, Aire: 1, Agua: 1 }, dominant: "Fuego", weakest: "Agua", total: 4 },
    rareza: { oneIn: 1728 },
    bloqueado: { rasgos: 0, tensiones: 0, planetas: 7 },
  },
};

function stubFetch(impl: (url: string) => Promise<unknown>) {
  // The init argument is declared even though impl ignores it: the tests
  // assert on the request BODY, which lives there.
  const mock = vi.fn(async (url: string, _init?: RequestInit) => impl(url));
  vi.stubGlobal("fetch", mock);
  return mock;
}

const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe("Reveal", () => {
  it("shows the dial before the floor elapses, even though the chart is back", async () => {
    stubFetch(async () => ok(chart));
    render(<Reveal />);
    await waitFor(() => expect(screen.getByText(/Fijando tus coordenadas/)).toBeTruthy());
    expect(screen.queryAllByText("ARTISTA")).toHaveLength(0);
  });

  // Tested as pure functions rather than through the rendered line: the dial
  // advances every 750ms, so asserting on line 1 through waitFor races it.
  it("formats coordinates the Spanish way", () => {
    expect(formatCoords(43.26271, -2.92528)).toBe("43,26° N · 2,93° O");
    expect(formatCoords(-34.6037, -58.3816)).toBe("34,60° S · 58,38° O");
    expect(formatCoords(35.68, 139.69)).toBe("35,68° N · 139,69° E");
  });

  it("formats the date the long Spanish way", () => {
    expect(formatFecha("2000-07-28")).toBe("28 de julio de 2000");
    expect(formatFecha("1992-04-15")).toBe("15 de abril de 1992");
  });

  it("puts their own city and date into the dial", async () => {
    stubFetch(async () => ok(chart));
    render(<Reveal />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    const seen: string[] = [];
    for (let n = 0; n < 3; n++) {
      seen.push(screen.getByRole("status").textContent!);
      await new Promise((r) => setTimeout(r, 800));
    }
    const all = seen.join(" ");
    expect(all).toContain("Bilbao");
    expect(all).toContain("28 de julio de 2000");
  });

  it("sends hourKnown and the coordinates to both endpoints", async () => {
    const mock = stubFetch(async () => ok(chart));
    render(<Reveal />);
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));

    const urls = mock.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain("/api/chart");
    expect(urls).toContain("/api/free");

    for (const call of mock.mock.calls) {
      const body = JSON.parse(call[1]!.body as string);
      expect(body).toMatchObject({
        date: "2000-07-28", time: "22:45", hourKnown: true,
        latitude: 43.263, longitude: -2.935,
      });
    }
  });

  it("fires both requests at once rather than in sequence", async () => {
    const mock = stubFetch(async () => new Promise(() => {}) as Promise<never>);
    render(<Reveal />);
    // /api/free must not wait for /api/chart: the whole point of the floor is
    // that the ~9,5s prose call is already in flight while the dial runs.
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));
  });

  it("never puts a personal answer in a request URL", async () => {
    const mock = stubFetch(async () => ok(chart));
    render(<Reveal />);
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));
    for (const call of mock.mock.calls) {
      expect(String(call[0])).not.toMatch(/Carlos|2000-07-28|43\.263|Bilbao/);
    }
  });

  it("surfaces a chart failure as an error with a retry", async () => {
    stubFetch(async (url) =>
      url === "/api/chart"
        ? { ok: false, json: async () => ({ error: "Fecha u hora no válidas." }) }
        : ok({ apertura: "a", amor: "b", hook: "h" }),
    );
    render(<Reveal />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/no válidas/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeTruthy();
  });

  // The row that matters: a failed READING must never cost four answers,
  // because the chart is already computed and recomputing it is free.
  it("still renders the card when only the reading fails", async () => {
    vi.useFakeTimers();
    stubFetch(async (url) =>
      url === "/api/chart" ? ok(chart) : { ok: false, json: async () => ({ error: "boom" }) },
    );
    render(<Reveal />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByText("ARTISTA").length).toBeGreaterThan(0);
  });

  it("renders the card once the floor has passed", async () => {
    vi.useFakeTimers();
    stubFetch(async (url) =>
      url === "/api/chart" ? ok(chart) : ok({ apertura: "a", amor: "b", hook: "h" }),
    );
    render(<Reveal />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.getAllByText("ARTISTA").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Fijando tus coordenadas/)).toBeNull();
  });
});

describe("Reveal, before storage is read", () => {
  // The first render has no answers, so a placeholder line would read
  // "Fijando tus coordenadas: —". Caught in the browser, not by a test.
  it("never shows a line with an em-dash placeholder in it", async () => {
    stubFetch(async () => ok(chart));
    const seen: string[] = [];
    const { container } = render(<Reveal />);
    const observer = setInterval(() => {
      const s = container.querySelector('[role="status"]');
      if (s?.textContent) seen.push(s.textContent);
    }, 5);
    await new Promise((r) => setTimeout(r, 300));
    clearInterval(observer);
    expect(seen.some((l) => l.includes("—"))).toBe(false);
  });
});
