"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { Dial, DIAL_FLOOR_MS } from "./Dial";
import { Reading } from "./Reading";
import { ERRORES_ES } from "@core/copy/flow.es";
import type { ChartResponse, FreeReading } from "./types";

/** The cap applies to /api/chart ONLY. See below. */
const CHART_CAP_MS = 12_000;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "43,26° N · 2,93° O" — Spanish decimal comma, O for oeste. */
export function formatCoords(lat: number, lon: number): string {
  const dec = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
  return `${dec(lat)}° ${lat >= 0 ? "N" : "S"} · ${dec(lon)}° ${lon >= 0 ? "E" : "O"}`;
}

/** "28 de julio de 2000" */
export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/**
 * Orchestrates the reveal.
 *
 * Both fetches fire AT ONCE, and the dial runs for a FLOOR of 4.5s regardless
 * of how fast the chart comes back — it comes back in ~80ms. Firing /api/free
 * in parallel is the whole point: Addendum 7 measures it at ~9,5s end to end
 * (more on a retry), so it needs to already be in flight while the dial plays.
 *
 * The 12s cap applies to /api/chart only. /api/free is allowed to keep running
 * underneath a finished card, because the card does not depend on it.
 */
export function Reveal() {
  const { answers, ready } = useBirthAnswers();
  const [floorDone, setFloorDone] = useState(false);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [free, setFree] = useState<FreeReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeFailed, setFreeFailed] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setFloorDone(true), DIAL_FLOOR_MS);
    return () => clearTimeout(id);
  }, []);

  const payload = useCallback(() => {
    const { date, time, place, firstName, hourKnown } = answers;
    if (!date || !time || !place) return null;
    return {
      firstName: firstName?.trim() || undefined,
      date,
      time,
      hourKnown: hourKnown !== false,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }, [answers]);

  const post = useCallback((url: string, body: object) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }), []);

  /**
   * The reading alone. Never re-posts /api/chart — it is already computed.
   *
   * No setState before the first await: doing it synchronously would make
   * this a cascading render when the mount effect calls it. Clearing the
   * failed flag belongs to the retry path, which is the only caller that can
   * have one to clear.
   */
  const fetchReading = useCallback(async (body: object) => {
    try {
      const res = await post("/api/free", body);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setFree({ apertura: data.apertura, amor: data.amor, hook: data.hook });
    } catch {
      setFreeFailed(true);
    }
  }, [post]);

  const retryReading = useCallback(() => {
    const body = payload();
    if (!body) return;
    setFreeFailed(false);
    void fetchReading(body);
  }, [payload, fetchReading]);

  useEffect(() => {
    if (!ready || fired.current) return;
    const body = payload();
    if (!body) return;
    fired.current = true;

    // A plain local flag, not a state updater: updaters must be pure, and
    // doing the "did it arrive?" check inside one would fire a second
    // setState as a side effect — twice over, under StrictMode.
    let chartArrived = false;
    const cap = setTimeout(() => {
      if (!chartArrived) setError(ERRORES_ES.conexion);
    }, CHART_CAP_MS);

    post("/api/chart", body)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? ERRORES_ES.datos);
        chartArrived = true;
        setChart(data);
      })
      .catch((e: Error) => setError(e.message || ERRORES_ES.conexion))
      .finally(() => clearTimeout(cap));

    // The rule cannot see through the function boundary: fetchReading awaits
    // before it touches state, so there is no synchronous cascade for the rule
    // to prevent. The /api/chart call directly above does the same thing and
    // passes only because it happens to be written inline.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReading(body);
  }, [ready, payload, post, fetchReading]);

  if (error) {
    return (
      <div className="dial">
        <p className="error" role="alert">{error}</p>
        <button type="button" className="submit" onClick={() => location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  // Storage has not been read yet, so the answers are empty. Showing the dial
  // now would print "Fijando tus coordenadas: —" for a frame before the real
  // ones arrive — measured at 2ms in the browser, but it is still wrong text.
  // The ring alone carries the beat until there is something true to say.
  if (!ready) {
    return (
      <div className="dial">
        <div className="dial__aro" aria-hidden="true" />
      </div>
    );
  }

  if (!floorDone || !chart) {
    const place = answers.place;
    return (
      <Dial
        coords={place ? formatCoords(place.latitude, place.longitude) : "—"}
        ciudad={place?.name ?? "—"}
        fecha={answers.date ? formatFecha(answers.date) : "—"}
      />
    );
  }

  return (
    <Reading
      profile={chart}
      free={free}
      freeFailed={freeFailed}
      firstName={answers.firstName?.trim() || undefined}
      onRetryReading={retryReading}
    />
  );
}
