"use client";

import { useRef, useState } from "react";
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import { CARD_FONT_CSS } from "@/lib/card-fonts";
import type { FreeCard } from "@core/card";

const W = 1080;
const H = 1920; // 9:16 — Instagram Stories and TikTok native

const ELEMENTS = ["Fuego", "Tierra", "Aire", "Agua"] as const;
const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function CharacterCardShare({
  card, firstName,
}: { card: FreeCard; firstName?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranked = ELEMENTS.slice()
    .sort((a, b) => card.afinidad.totals[b] - card.afinidad.totals[a]);
  const max = card.afinidad.totals[ranked[0]];

  async function share() {
    const svg = svgRef.current;
    if (!svg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await rasterise(svg);
      const file = new File([blob], "mi-ficha.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi-ficha.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("No se pudo preparar la imagen.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share">
      <svg
        ref={svgRef}
        className="share__card"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Tu ficha: ${card.clase.nombre}`}
      >
        {/* The faces travel INSIDE the SVG. A detached SVG in a blob URL sees
            neither the page's custom properties nor its next/font faces, so
            without this the PNG rasterises in Georgia (Addendum 13). */}
        <style>{CARD_FONT_CSS}</style>
        <rect width={W} height={H} fill="#10131c" />
        <rect x="48" y="48" width={W - 96} height={H - 96} fill="none"
              stroke="#262c3c" strokeWidth="2" />

        <text x={W / 2} y="250" textAnchor="middle" fill="#a9a496"
              className="cc-mono" fontSize="32" letterSpacing="10">CLASE</text>
        <text x={W / 2} y="380" textAnchor="middle" fill="#c9a227"
              className="cc-display" fontSize="104">{card.clase.nombre}</text>

        {[
          { label: "SE TE VE COMO", sign: card.seVe.sign },
          { label: "POR DENTRO", sign: card.porDentro.sign },
        ].map((r, i) => (
          <g key={r.label} transform={`translate(0 ${600 + i * 260})`}>
            <text x={W / 2} y="0" textAnchor="middle" fill="#c9a227"
                  className="cc-glyph" fontSize="104">{SIGN_GLYPH[r.sign]}</text>
            <text x={W / 2} y="86" textAnchor="middle" fill="#ece6da"
                  className="cc-display" fontSize="64">{SIGN_ES[r.sign]}</text>
            <text x={W / 2} y="140" textAnchor="middle" fill="#6e7689"
                  className="cc-mono" fontSize="28" letterSpacing="6">{r.label}</text>
          </g>
        ))}

        <text x="140" y="1240" fill="#a9a496" className="cc-mono"
              fontSize="30" letterSpacing="8">AFINIDAD</text>
        {ranked.map((k, i) => (
          <g key={k} transform={`translate(140 ${1310 + i * 76})`}>
            <text x="0" y="26" fill="#a9a496" className="cc-mono" fontSize="30">{k}</text>
            <rect x="220" y="6" width="480" height="24" fill="#262c3c" />
            <rect x="220" y="6" width={(card.afinidad.totals[k] / max) * 480}
                  height="24" fill="#c9a227" />
            {/* Weighted sum, not an independently checkable score — printed
                against `card.afinidad.total` so it reads as a share of a
                whole, same reasoning as CharacterCard.tsx's bars. Font size
                dropped from 30 to 24 for this row only: "9,5 / 20,5" is
                roughly 3x wider than the old bare "9,5", and at 30px the
                widest case would run past the 1032 inner border edge. */}
            <text x="740" y="26" fill="#a9a496" className="cc-mono" fontSize="24">
              {n(card.afinidad.totals[k])} / {n(card.afinidad.total)}
            </text>
          </g>
        ))}

        <text x={W / 2} y="1700" textAnchor="middle" fill="#b4653a"
              className="cc-mono" fontSize="34">
          1 de {card.rareza.oneIn.toLocaleString("es-ES")} combinaciones
        </text>
        {firstName && (
          <text x={W / 2} y="1760" textAnchor="middle" fill="#6e7689"
                className="cc-display" fontSize="32">La ficha de {firstName}</text>
        )}
        <text x={W / 2} y="1840" textAnchor="middle" fill="#a9a496"
              className="cc-mono" fontSize="28" letterSpacing="8">DESTINY REPORTS</text>
      </svg>

      <button className="submit" onClick={share} disabled={busy}>
        {busy ? "Preparando…" : "Compartir o guardar"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * SVG → PNG via canvas. The SVG must be self-contained: no external references,
 * fonts declared inline. Nothing external is fetched, so the canvas stays
 * untainted and toBlob works.
 */
async function rasterise(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no se pudo rasterizar la ficha"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob vacío"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
