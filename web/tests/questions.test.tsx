// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nombre } from "@/components/questions/Nombre";
import { Cuando } from "@/components/questions/Cuando";
import { Lugar } from "@/components/questions/Lugar";
import { STORAGE_KEY } from "@/hooks/useBirthAnswers";
import { SUN_SIGN_BY_DAY } from "@core/sunsign-table";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => sessionStorage.clear());

const stored = () => JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");

/** A date the generated table marks as guarded, whatever it happens to be. */
const GUARDED = `2000-${Object.entries(SUN_SIGN_BY_DAY).find(([, v]) => v === null)![0]}`;

describe("Nombre", () => {
  it("stores the name and reacts with it", async () => {
    const user = userEvent.setup();
    render(<Nombre onNext={() => {}} />);
    await user.type(screen.getByLabelText(/te llamas/i), "Carlos");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(stored().firstName).toBe("Carlos");
    expect(screen.getByText(/Vale, Carlos/)).toBeTruthy();
  });

  it("is skippable and advances without a name", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Nombre onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /prefiero no decirlo/i }));
    expect(stored().firstName).toBeUndefined();
    expect(onNext).toHaveBeenCalled();
  });

  it("does not advance on an empty name via the main button", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Nombre onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("Cuando", () => {
  it("shows the class the moment a certain date is entered, with no press", () => {
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    expect(screen.getByText("ARTISTA")).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  // The cusp guard at the surface. Naming a class here would contradict the
  // card at the reveal twenty seconds later.
  it("renders the cusp line and no class on a guarded day", () => {
    render(<Cuando onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: GUARDED } });
    expect(screen.queryByText("ARTISTA")).toBeNull();
    expect(screen.getByText(/cambiando de signo/i)).toBeTruthy();
  });

  it("commits date and a typed hour on the single advance press", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    fireEvent.change(screen.getByLabelText(/qué hora/i), { target: { value: "22:45" } });
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(stored()).toMatchObject({ date: "2000-07-28", time: "22:45", hourKnown: true });
    expect(onNext).toHaveBeenCalled();
  });

  it("writes 12:00 and hourKnown false when the hour is skipped, without advancing", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /no la sé/i }));
    expect(stored()).toMatchObject({ time: "12:00", hourKnown: false });
    expect(onNext).not.toHaveBeenCalled();
  });

  it("advances from a skipped hour once the date is filled", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /no la sé/i }));
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onNext).toHaveBeenCalled();
    expect(stored().date).toBe("2000-07-28");
  });

  it("keeps the CTA disabled until the date is valid and the hour answered", () => {
    render(<Cuando onNext={() => {}} />);
    const cta = () => screen.getByRole("button", { name: /siguiente/i }) as HTMLButtonElement;
    expect(cta().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    expect(cta().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/qué hora/i), { target: { value: "22:45" } });
    expect(cta().disabled).toBe(false);
  });

  it("restores a date already answered, for the back gesture", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "1992-04-15" }));
    render(<Cuando onNext={() => {}} />);
    return waitFor(() =>
      expect((screen.getByLabelText(/día naciste/i) as HTMLInputElement).value).toBe("1992-04-15"),
    );
  });
});

describe("Lugar", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => [{
        name: "Bilbao", region: "País Vasco", countryCode: "ES",
        latitude: 43.263, longitude: -2.935,
      }],
    })));
  });

  it("cannot be committed before a place is chosen", () => {
    render(<Lugar onNext={() => {}} />);
    expect((screen.getByRole("button", { name: /crear mi carta/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  // Spec: choosing a place must NOT auto-advance. The commit is the roll.
  it("does not advance on choosing, only on the button", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Lugar onNext={onNext} />);
    await waitFor(() => screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "Bilbao");
    await waitFor(() => screen.getByRole("option"));
    await user.click(screen.getByRole("option"));
    expect(onNext).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /crear mi carta/i }));
    expect(onNext).toHaveBeenCalled();
    expect(stored().place).toMatchObject({ name: "Bilbao", latitude: 43.263 });
  });

  it("shows no astrological reaction of its own", async () => {
    render(<Lugar onNext={() => {}} />);
    await waitFor(() => screen.getByRole("combobox"));
    expect(screen.queryByText(/Ascendente/i)).toBeNull();
  });
});

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

describe("StepGuard", () => {
  beforeEach(() => replace.mockClear());

  it("bounces to the first question when a required answer is missing", async () => {
    const { StepGuard } = await import("@/components/questions/StepGuard");
    render(<StepGuard needs={["date"]}><p>contenido</p></StepGuard>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/crear/nombre"));
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("renders the step when every required answer is present", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "2000-07-28", time: "22:45" }));
    const { StepGuard } = await import("@/components/questions/StepGuard");
    render(<StepGuard needs={["date", "time"]}><p>contenido</p></StepGuard>);
    await waitFor(() => expect(screen.getByText("contenido")).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });

  // hourKnown:false is a real answer, not an absent one. Treating `false` as
  // missing would bounce everyone who skipped the hour.
  it("treats a false answer as present", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "2000-07-28", time: "12:00", hourKnown: false }));
    const { StepGuard } = await import("@/components/questions/StepGuard");
    render(<StepGuard needs={["hourKnown"]}><p>contenido</p></StepGuard>);
    await waitFor(() => expect(screen.getByText("contenido")).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("Lugar, returning to the step", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
  });

  // Regression: Lugar seeded `useState(answers.place)`, which captures the
  // FIRST render — always empty, because the hook reads storage in an effect.
  // The commit button stayed disabled forever for anyone coming back here,
  // which the browser caught and no test did.
  it("is committable straight away when a place is already stored", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: "2000-07-28", time: "22:45",
      place: { name: "Bilbao", region: "País Vasco", countryCode: "ES", latitude: 43.263, longitude: -2.935 },
    }));
    render(<Lugar onNext={() => {}} />);
    await waitFor(() => {
      const commit = screen.getByRole("button", { name: /crear mi carta/i }) as HTMLButtonElement;
      expect(commit.disabled).toBe(false);
    });
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("Bilbao, País Vasco");
  });
});
