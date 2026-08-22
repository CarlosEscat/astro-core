"use client";

import { useCallback, useEffect, useState } from "react";

export interface Place {
  name: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface BirthAnswers {
  firstName?: string;
  date?: string;
  time?: string;
  /** False when the person skipped the hour and 12:00 was assumed. */
  hourKnown?: boolean;
  place?: Place;
}

export const STORAGE_KEY = "destiny.answers";

function read(): BirthAnswers {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BirthAnswers) : {};
  } catch {
    // Corrupt JSON, or storage blocked entirely. Neither should wall someone
    // out of the flow — an empty object just sends them back to question 1.
    return {};
  }
}

/**
 * The four answers, kept in sessionStorage.
 *
 * Storage is what makes the browser's back button work as the flow's back
 * (spec decision 5): no on-screen back button is drawn, but each step route
 * mounts this hook fresh and finds the earlier answer still there, so the
 * back gesture and the iOS edge-swipe behave the way people expect.
 *
 * sessionStorage rather than localStorage: birth data should not outlive the
 * tab. Nothing personal ever goes in the URL.
 */
export function useBirthAnswers() {
  const [answers, setAnswers] = useState<BirthAnswers>({});
  const [ready, setReady] = useState(false);

  // Storage does not exist during SSR, so the first render is always empty and
  // `ready` stays false until the client has read it. Guarding a step before
  // then would bounce everyone back to question 1.
  useEffect(() => {
    setAnswers(read());
    setReady(true);
  }, []);

  const set = useCallback((patch: Partial<BirthAnswers>) => {
    setAnswers((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private-mode quota. The flow still works for this session; only the
        // back gesture loses its memory.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to remove */
    }
    setAnswers({});
  }, []);

  return { answers, set, clear, ready };
}
