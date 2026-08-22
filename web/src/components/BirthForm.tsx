"use client";

import { useState } from "react";
import { CharacterCardView } from "./CharacterCard";
import { PlaceCombo } from "./PlaceCombo";
import { CharacterCardShare } from "./CharacterCardShare";
import { Matches } from "./Matches";
import { LoveHook } from "./LoveHook";
import type { ChartResponse, FreeReading } from "./types";
import type { Place } from "@/hooks/useBirthAnswers";

export function BirthForm() {
  const [firstName, setFirstName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ChartResponse | null>(null);
  const [free, setFree] = useState<FreeReading | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!place) {
      setError("Elige tu lugar de nacimiento de la lista para calcular la carta.");
      return;
    }
    setLoading(true);
    setFree(null);
    setProfile(null);

    const payload = {
      firstName: firstName.trim() || undefined,
      date,
      time,
      latitude: place.latitude,
      longitude: place.longitude,
    };

    try {
      // Every computed module is local math: show them immediately, then wait
      // only for the prose. The page fills with dense, specific content before
      // any LLM call returns — the precision arrives first.
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
      setProfile(chartData);

      const res = await fetch("/api/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo ha fallado. Inténtalo de nuevo.");
      } else {
        setFree({ apertura: data.apertura, amor: data.amor, hook: data.hook });
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

        <PlaceCombo
          value={query}
          onQueryChange={(q) => {
            setQuery(q);
            setPlace(null);
          }}
          onChoose={setPlace}
        />

        <button className="submit" type="submit" disabled={loading}>
          {loading ? "Leyendo tu carta…" : "Ver mi lectura gratuita"}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {loading && !profile && (
        <p className="working" aria-live="polite">
          <span>Calculando posiciones</span>
        </p>
      )}

      {profile && (
        <section className="reading" aria-live="polite">
          <CharacterCardView card={profile.card} firstName={firstName.trim() || undefined} />

          {/* Love sits second: it is the shareable unit. */}
          <section className="module">
            <h2 className="module__title">En el amor</h2>
            {free ? (
              <LoveHook hook={free.hook} prose={free.amor} />
            ) : (
              <p className="writing"><span>Leyendo tu carta</span></p>
            )}
          </section>

          <section className="module">
            <h2 className="module__title">Con quién encajas</h2>
            <Matches matches={profile.matches} friction={profile.friction}
                     weakest={profile.elements.weakest} />
          </section>

          <section className="module">
            <h2 className="module__title">Lo que más pesa en tu carta</h2>
            {free ? (
              <div className="prose">
                {free.apertura.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            ) : (
              <p className="writing"><span>Leyendo tu carta</span></p>
            )}
          </section>

          <CharacterCardShare card={profile.card} firstName={firstName.trim() || undefined} />

          {free && <div className="next-step">
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
