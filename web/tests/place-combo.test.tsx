// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaceCombo } from "@/components/PlaceCombo";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const bilbao = {
  name: "Bilbao", region: "País Vasco", countryCode: "ES",
  latitude: 43.263, longitude: -2.935,
};

function stubPlaces(found: unknown[]) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => found }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => stubPlaces([bilbao]));

describe("PlaceCombo", () => {
  it("renders a combobox with the aria wiring the flow depends on", () => {
    render(<PlaceCombo value="" onQueryChange={() => {}} onChoose={() => {}} />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-controls")).toBe("lugar-opciones");
  });

  it("does not look up a query shorter than two characters", async () => {
    const fetchMock = stubPlaces([bilbao]);
    render(<PlaceCombo value="B" onQueryChange={() => {}} onChoose={() => {}} />);
    await new Promise((r) => setTimeout(r, 250));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands the chosen place to onChoose", async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<PlaceCombo value="Bilbao" onQueryChange={() => {}} onChoose={onChoose} />);
    await waitFor(() => screen.getByRole("option"));
    await user.click(screen.getByRole("option"));
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ name: "Bilbao" }));
  });

  it("shows the region and country beside the place name", async () => {
    render(<PlaceCombo value="Bilbao" onQueryChange={() => {}} onChoose={() => {}} />);
    await waitFor(() => screen.getByRole("option"));
    expect(screen.getByText("País Vasco · ES")).toBeTruthy();
  });

  it("chooses the highlighted option on Enter", async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<PlaceCombo value="Bilbao" onQueryChange={() => {}} onChoose={onChoose} />);
    await waitFor(() => screen.getByRole("option"));
    await user.type(screen.getByRole("combobox"), "{Enter}");
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ name: "Bilbao" }));
  });

  it("reports an empty lookup so the caller can show a message", async () => {
    stubPlaces([]);
    const onEmpty = vi.fn();
    render(<PlaceCombo value="Xyzzyx" onQueryChange={() => {}} onChoose={() => {}} onEmpty={onEmpty} />);
    await waitFor(() => expect(onEmpty).toHaveBeenCalled());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps the hint about small villages", () => {
    render(<PlaceCombo value="" onQueryChange={() => {}} onChoose={() => {}} />);
    expect(screen.getByText(/municipio más cercano/)).toBeTruthy();
  });
});
