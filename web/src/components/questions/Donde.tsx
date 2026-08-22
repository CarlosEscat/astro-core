"use client";

import { useState } from "react";
import { useBirthAnswers, type Place } from "@/hooks/useBirthAnswers";
import { PlaceCombo } from "@/components/PlaceCombo";
import { ERRORES_ES } from "@core/copy/flow.es";

/**
 * Question 3. NO inline reaction, by spec: the Ascendant line belongs to the
 * reveal, and pre-empting it here would spend the climax a screen early.
 *
 * Choosing a place does not advance either. The step ends with an explicit
 * press, because the person needs to commit — that is the roll, and it is
 * what makes the wait that follows feel earned rather than imposed.
 */
export function Donde({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Place | null>(null);
  const [empty, setEmpty] = useState(false);

  // Derived, not seeded. useState(answers.place) captures the FIRST render,
  // which is always empty — the hook reads sessionStorage in an effect.
  // Seeding it left the commit button permanently disabled for anyone
  // returning to this step with a place already chosen.
  const place = touched ? picked : answers.place ?? null;
  const value = touched
    ? query
    : answers.place
      ? `${answers.place.name}, ${answers.place.region || answers.place.countryCode}`
      : "";

  function commit() {
    if (!place) return;
    set({ place });
    onNext();
  }

  return (
    <div className="pregunta">
      <PlaceCombo
        value={value}
        onQueryChange={(q) => { setTouched(true); setQuery(q); setPicked(null); setEmpty(false); }}
        onChoose={(p) => { setTouched(true); setPicked(p); setEmpty(false); }}
        onEmpty={() => setEmpty(true)}
      />

      {empty && <p className="error" role="alert">{ERRORES_ES.lugarVacio}</p>}

      <button type="button" className="submit" disabled={!place} onClick={commit}>
        Crear mi carta
      </button>
    </div>
  );
}
