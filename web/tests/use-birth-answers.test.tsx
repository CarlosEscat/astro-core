// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBirthAnswers, STORAGE_KEY } from "@/hooks/useBirthAnswers";

beforeEach(() => sessionStorage.clear());

const bilbao = {
  name: "Bilbao", region: "País Vasco", countryCode: "ES",
  latitude: 43.263, longitude: -2.935,
};

describe("useBirthAnswers", () => {
  it("starts empty and becomes ready", () => {
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers).toEqual({});
    expect(result.current.ready).toBe(true);
  });

  it("persists a patch to sessionStorage", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    expect(result.current.answers.firstName).toBe("Carlos");
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).firstName).toBe("Carlos");
  });

  it("merges patches rather than replacing", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    act(() => result.current.set({ date: "2000-07-28" }));
    expect(result.current.answers).toEqual({ firstName: "Carlos", date: "2000-07-28" });
  });

  it("round-trips a place, which is the only nested answer", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ place: bilbao }));
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).place).toEqual(bilbao);
  });

  // This is what makes the browser's back button work as the flow's back:
  // each step route mounts the hook fresh and finds the earlier answer there.
  it("rehydrates from storage on a fresh mount", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "1992-03-04" }));
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers.date).toBe("1992-03-04");
  });

  it("survives corrupt storage rather than throwing", () => {
    sessionStorage.setItem(STORAGE_KEY, "{ not json");
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers).toEqual({});
    expect(result.current.ready).toBe(true);
  });

  it("keeps hourKnown false distinct from absent", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ time: "12:00", hourKnown: false }));
    expect(result.current.answers.hourKnown).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).hourKnown).toBe(false);
  });

  it("clears everything", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    act(() => result.current.clear());
    expect(result.current.answers).toEqual({});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
