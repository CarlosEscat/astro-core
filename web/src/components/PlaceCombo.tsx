"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Place } from "@/hooks/useBirthAnswers";

interface Props {
  /** The text in the box. The caller owns it so it can be restored on back. */
  value: string;
  onQueryChange: (query: string) => void;
  onChoose: (place: Place) => void;
  /** Fired when a lookup comes back with nothing. */
  onEmpty?: () => void;
  id?: string;
}

/**
 * Birth-place autocomplete over /api/places (bundled GeoNames, Addendum 4).
 *
 * Extracted verbatim from BirthForm so a question screen can use it: same
 * 180 ms debounce, same arrow-key handling, same aria wiring, same hint. The
 * only change is that the query lives with the caller rather than here, which
 * is what lets the flow restore it when someone goes back a step.
 */
export function PlaceCombo({ value, onQueryChange, onChoose, onEmpty, id = "lugar" }: Props) {
  const [options, setOptions] = useState<Place[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Debounced place lookup. Skipped once a place is chosen.
  useEffect(() => {
    if (chosen || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
        const found: Place[] = await res.json();
        setOptions(found);
        setOpen(found.length > 0);
        setHighlighted(found.length > 0 ? 0 : -1);
        if (found.length === 0) onEmpty?.();
      } catch {
        setOptions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
    // onEmpty is deliberately not a dependency: callers pass an inline arrow,
    // and including it would re-fire the lookup on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, chosen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!comboRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const choose = useCallback(
    (p: Place) => {
      setChosen(true);
      onQueryChange(`${p.name}, ${p.region || p.countryCode}`);
      setOpen(false);
      setOptions([]);
      onChoose(p);
    },
    [onChoose, onQueryChange],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + options.length) % options.length);
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      choose(options[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="field combo" ref={comboRef}>
      <label htmlFor={id}>Lugar de nacimiento</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="lugar-opciones"
        aria-autocomplete="list"
        aria-activedescendant={highlighted >= 0 ? `lugar-op-${highlighted}` : undefined}
        autoComplete="off"
        placeholder="Empieza a escribir…"
        value={value}
        onChange={(e) => {
          setChosen(false);
          onQueryChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
      />
      {open && options.length > 0 && (
        <ul className="options" id="lugar-opciones" role="listbox">
          {options.map((p, i) => (
            <li
              key={`${p.name}-${p.latitude}-${p.longitude}`}
              id={`lugar-op-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => choose(p)}
            >
              <span className="place">{p.name}</span>
              <span className="where">
                {[p.region, p.countryCode].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="hint">
        ¿Naciste en un pueblo muy pequeño? Elige el municipio más cercano.
      </span>
    </div>
  );
}
