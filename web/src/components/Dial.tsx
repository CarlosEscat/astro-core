"use client";

import { useEffect, useState } from "react";
import { DIAL_ES } from "@core/copy/flow.es";

export const DIAL_FLOOR_MS = 4500;
export const DIAL_LINE_MS = 750;

/**
 * The reveal (spec decision 6).
 *
 * This is a DELIBERATE wait, not a spinner waiting on the network:
 * /api/chart returns in ~80ms. A future session must NOT "simplify" it back
 * to an instant render. Two things justify it — the wait is what makes the
 * 9,90 € feel like it buys computation, and it pushes the prose skeleton
 * below the fold instead of making it the first thing anyone sees.
 *
 * This deliberately reverses the Espera artboard, whose sticky note reads
 * "El cálculo tarda 0,553 ms … Candidato a borrarse."
 *
 * Six lines at 750ms = the 4.5s floor. Past the last line it HOLDS rather
 * than looping: the network really is still working, so holding is honest
 * and looping would be theatre.
 */
export function Dial({ coords, ciudad, fecha }: {
  coords: string;
  ciudad: string;
  fecha: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= DIAL_ES.length - 1) return;
    const id = setTimeout(() => setI((n) => n + 1), DIAL_LINE_MS);
    return () => clearTimeout(id);
  }, [i]);

  const linea = DIAL_ES[i]
    .replace("{coords}", coords)
    .replace("{ciudad}", ciudad)
    .replace("{fecha}", fecha);

  return (
    <div className="dial">
      {/* Decorative: the line below is what carries the meaning. */}
      <div className="dial__aro" aria-hidden="true" />
      <p className="dial__linea" role="status" aria-live="polite">{linea}</p>
    </div>
  );
}
