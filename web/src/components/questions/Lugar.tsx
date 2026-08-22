"use client";

import { useState } from "react";
import { useBirthAnswers, type Place } from "@/hooks/useBirthAnswers";
import { PlaceCombo } from "@/components/PlaceCombo";
import { ERRORES_ES } from "@core/copy/flow.es";

/**
 * Question 4. NO inline reaction, by spec: the Ascendant line belongs to the
 * reveal, and pre-empting it here would spend the climax a screen early.
 *
 * Choosing a place does not advance either. The step ends with an explicit
 * press, because the person needs to commit — that is the roll, and it is
 * what makes the wait that follows feel earned rather than imposed.
 */
export function Lugar({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(answers.place ?? null);
  const [empty, setEmpty] = useState(false);

  function commit() {
    if (!place) return;
    set({ place });
    onNext();
  }

  return (
    <div className="pregunta">
      <PlaceCombo
        value={query}
        onQueryChange={(q) => { setQuery(q); setPlace(null); setEmpty(false); }}
        onChoose={(p) => { setPlace(p); setEmpty(false); }}
        onEmpty={() => setEmpty(true)}
      />

      {empty && <p className="error" role="alert">{ERRORES_ES.lugarVacio}</p>}

      <button type="button" className="submit" disabled={!place} onClick={commit}>
        Crear mi carta
      </button>
    </div>
  );
}
