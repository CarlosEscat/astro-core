"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Place {
  name: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

interface BigThree {
  sun: { sign: string; degree: number; house: number };
  moon: { sign: string; degree: number; house: number };
  ascendant: { sign: string; degree: number };
}

// U+FE0E keeps the glyphs as engraved text rather than colour emoji.
const SIGNS: Record<string, { es: string; glyph: string }> = {
  Aries: { es: "Aries", glyph: "♈︎" },
  Taurus: { es: "Tauro", glyph: "♉︎" },
  Gemini: { es: "Géminis", glyph: "♊︎" },
  Cancer: { es: "Cáncer", glyph: "♋︎" },
  Leo: { es: "Leo", glyph: "♌︎" },
  Virgo: { es: "Virgo", glyph: "♍︎" },
  Libra: { es: "Libra", glyph: "♎︎" },
  Scorpio: { es: "Escorpio", glyph: "♏︎" },
  Sagittarius: { es: "Sagitario", glyph: "♐︎" },
  Capricorn: { es: "Capricornio", glyph: "♑︎" },
  Aquarius: { es: "Acuario", glyph: "♒︎" },
  Pisces: { es: "Piscis", glyph: "♓︎" },
};

/** 10.1 → 10°06' — the notation an astrologer actually writes. */
function formatDegree(decimal: number): string {
  const d = Math.floor(decimal);
  const m = Math.round((decimal - d) * 60);
  return m === 60 ? `${d + 1}°00'` : `${d}°${String(m).padStart(2, "0")}'`;
}

export function BirthForm() {
  const [firstName, setFirstName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [options, setOptions] = useState<Place[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [bigThree, setBigThree] = useState<BigThree | null>(null);

  const comboRef = useRef<HTMLDivElement>(null);

  // Debounced place lookup. Skipped once a place is chosen.
  useEffect(() => {
    if (place || query.trim().length < 2) {
      setOptions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
        const found: Place[] = await res.json();
        setOptions(found);
        setOpen(found.length > 0);
        setHighlighted(found.length > 0 ? 0 : -1);
      } catch {
        setOptions([]);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [query, place]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!comboRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const choose = useCallback((p: Place) => {
    setPlace(p);
    setQuery(`${p.name}, ${p.region || p.countryCode}`);
    setOpen(false);
    setOptions([]);
  }, []);

  function onPlaceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!place) {
      setError("Elige tu lugar de nacimiento de la lista para calcular la carta.");
      return;
    }
    setLoading(true);
    setTeaser(null);
    setBigThree(null);

    const payload = {
      firstName: firstName.trim() || undefined,
      date,
      time,
      latitude: place.latitude,
      longitude: place.longitude,
    };

    try {
      // The placements are local math: show them immediately, then wait
      // only for the prose. The reader sees exact data within a blink.
      const chartRes = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const chartData = await chartRes.json();
      if (!chartRes.ok) {
        setError(chartData.error ?? "No hemos podido calcular tu carta.");
        setLoading(false);
        return;
      }
      setBigThree(chartData);

      const res = await fetch("/api/teaser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo ha fallado. Inténtalo de nuevo.");
      } else {
        setTeaser(data.teaser);
      }
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="panel" onSubmit={onSubmit} noValidate>
        <p className="panel__legend">Datos de nacimiento</p>

        <div className="field">
          <label htmlFor="nombre">Tu nombre de pila</label>
          <input
            id="nombre"
            type="text"
            autoComplete="given-name"
            placeholder="Opcional"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              type="date"
              required
              min="1900-01-01"
              max="2030-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="hora">Hora</label>
            <input
              id="hora"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <p className="hint hint--row">
          La hora mueve el Ascendente. Si no la sabes exacta, aproxímala lo más
          que puedas.
        </p>

        <div className="field combo" ref={comboRef}>
          <label htmlFor="lugar">Lugar de nacimiento</label>
          <input
            id="lugar"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="lugar-opciones"
            aria-autocomplete="list"
            aria-activedescendant={highlighted >= 0 ? `lugar-op-${highlighted}` : undefined}
            autoComplete="off"
            placeholder="Empieza a escribir…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPlace(null);
            }}
            onKeyDown={onPlaceKeyDown}
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

        <button className="submit" type="submit" disabled={loading}>
          {loading ? "Leyendo tu carta…" : "Ver mi lectura gratuita"}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {loading && !bigThree && (
        <p className="working" aria-live="polite">
          <span>Calculando posiciones</span>
        </p>
      )}

      {bigThree && (
        <section className="reading" aria-live="polite">
          <div className="readout">
            <div>
              <span className="role">Sol</span>
              <span className="sym">{SIGNS[bigThree.sun.sign]?.glyph}</span>
              <span className="sign">{SIGNS[bigThree.sun.sign]?.es}</span>
              <span className="deg">{formatDegree(bigThree.sun.degree)}</span>
            </div>
            <div>
              <span className="role">Luna</span>
              <span className="sym">{SIGNS[bigThree.moon.sign]?.glyph}</span>
              <span className="sign">{SIGNS[bigThree.moon.sign]?.es}</span>
              <span className="deg">{formatDegree(bigThree.moon.degree)}</span>
            </div>
            <div>
              <span className="role">Ascendente</span>
              <span className="sym">{SIGNS[bigThree.ascendant.sign]?.glyph}</span>
              <span className="sign">{SIGNS[bigThree.ascendant.sign]?.es}</span>
              <span className="deg">{formatDegree(bigThree.ascendant.degree)}</span>
            </div>
          </div>

          <div className="reading__prose">
            {teaser ? (
              teaser.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
            ) : (
              <p className="writing">
                <span>Leyendo tu carta</span>
              </p>
            )}
          </div>

          {teaser && <div className="next-step">
            <h2>Esto es solo la superficie</h2>
            <p>
              El informe completo son ocho secciones y unas 2.000 palabras sobre
              tu identidad, tu mundo emocional, tus vínculos y tu vocación, con
              la misma regla: cada frase nombra la posición que la sustenta.{" "}
              <span className="price">9,90 €</span>, pago único.
            </p>
            <p className="soon">Disponible muy pronto</p>
          </div>}
        </section>
      )}
    </>
  );
}
