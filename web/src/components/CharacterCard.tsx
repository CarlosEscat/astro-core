import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import { formatDegree } from "@/lib/format";
import type { FreeCard } from "@core/card";

const ELEMENTS = ["Fuego", "Tierra", "Aire", "Agua"] as const;

const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

/**
 * The chart as a character sheet. Every figure is a count or a distribution the
 * reader can check against their own chart — never a score on a shared scale,
 * which would be a number we invented and they cannot audit.
 *
 * Pure: no fetch, no browser APIs, so it serves the free page, the delivery
 * route and Puppeteer alike.
 */
export function CharacterCardView({
  card, firstName,
}: { card: FreeCard; firstName?: string }) {
  const max = Math.max(...ELEMENTS.map((k) => card.afinidad.totals[k]));

  return (
    <section className="cc">
      <header className="cc__head">
        <p className="cc__label">Clase</p>
        <p className="cc__class cc-display">{card.clase.nombre}</p>
        {firstName && <p className="cc__name" data-name>La carta de {firstName}</p>}
      </header>

      <dl className="cc__rows">
        {[
          {
            key: "clase", label: "Quién eres", sign: card.clase.sign,
            degree: card.clase.signDegree, gloss: card.clase.gloss, area: null,
          },
          {
            key: "seVe", label: "Se te ve como", sign: card.seVe.sign,
            degree: card.seVe.signDegree, gloss: card.seVe.gloss, area: null,
          },
          {
            key: "porDentro", label: "Por dentro", sign: card.porDentro.sign,
            degree: card.porDentro.signDegree, gloss: card.porDentro.gloss,
            area: card.porDentro.area,
          },
        ].map((r) => (
          <div className="cc__row" key={r.key}>
            <dt>{r.label}</dt>
            <dd>
              <span className="cc__placement">
                <span className="cc-glyph">{SIGN_GLYPH[r.sign]}</span>{" "}
                {SIGN_ES[r.sign]}{" "}
                <span className="cc-mono cc__deg">{formatDegree(r.degree)}</span>
                {r.area && <> — {r.area}</>}
              </span>
              <span className="cc__gloss">{r.gloss}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="cc__block">
        <p className="cc__label">Afinidad</p>
        <div className="cc__bars">
          {ELEMENTS.slice()
            .sort((a, b) => card.afinidad.totals[b] - card.afinidad.totals[a])
            .map((k) => (
              <div className="cc__bar" key={k}>
                <span className="cc__bar-name">{k}</span>
                <span className="cc__bar-track">
                  <span
                    className="cc__bar-fill"
                    style={{ width: `${(card.afinidad.totals[k] / max) * 100}%` }}
                  />
                </span>
                <span className="cc__bar-val cc-mono">{n(card.afinidad.totals[k])}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="cc__locked">
        <p className="cc__lock" data-locked>
          <span className="cc__sr">Bloqueado: </span>{card.bloqueado.rasgos} rasgos
        </p>
        <p className="cc__lock" data-locked>
          <span className="cc__sr">Bloqueado: </span>{card.bloqueado.tensiones} tensiones
        </p>
        <p className="cc__lock" data-locked>
          <span className="cc__sr">Bloqueado: </span>{card.bloqueado.planetas} planetas
        </p>
      </div>

      {/* The rarity line counts a combination, so the combination has to be
          visible next to it. The three signs are each already on a row above,
          but split across three labels — this is the one place they read as
          the single thing 1728 is counting. Carried over from Signature.tsx,
          which the card absorbed. */}
      <p className="cc__combo">
        {[card.clase.sign, card.porDentro.sign, card.seVe.sign]
          .map((s) => `${SIGN_GLYPH[s]} ${SIGN_ES[s]}`)
          .join(" · ")}
      </p>

      <p className="cc__rarity cc-mono">
        1 de {card.rareza.oneIn.toLocaleString("es-ES")} combinaciones
      </p>
    </section>
  );
}
