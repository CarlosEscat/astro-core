"use client";

import { useRef, useState } from "react";
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { ChartResponse } from "./types";

const W = 1080;
const H = 1920; // 9:16 — Instagram Stories and TikTok native

/**
 * Fonts travel with the card. The page's faces arrive as next/font CSS
 * variables on <html>, which a serialised standalone SVG cannot see — so the
 * export would silently fall back to a default face. Declaring them inside the
 * SVG means the rules serialise with it, and the var() fallbacks are what the
 * exported PNG actually renders with.
 */
const CARD_CSS = `
  .sc-display { font-family: var(--font-display, Georgia, "Times New Roman", serif); }
  .sc-mono { font-family: var(--font-mono, ui-monospace, "Courier New", monospace); }
  .sc-body { font-family: var(--font-body, system-ui, sans-serif); }
`;

/**
 * The shareable "cosmic signature". The statistic is genuinely computed by
 * profile.signature(), never invented — same grounding discipline as the
 * report, because a fake number is exactly the thing this product is not.
 *
 * Drawn as inline SVG at 1080x1920 so one source serves both the on-screen
 * preview and the exported PNG; rasterising happens only on share.
 */
export function ShareCard({
  sig, firstName,
}: { sig: ChartResponse["signature"]; firstName?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = [
    { label: "Sol", sign: sig.sun },
    { label: "Luna", sign: sig.moon },
    { label: "Ascendente", sign: sig.ascendant },
  ];

  async function share() {
    const svg = svgRef.current;
    if (!svg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await rasterise(svg);
      const file = new File([blob], "mi-carta.png", { type: "image/png" });
      // Web Share with files is the good path on mobile, which is where this
      // card is actually shared. Download is the desktop fallback.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi-carta.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Dismissing the OS share sheet rejects too; that is not an error worth
      // showing anybody.
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
        aria-label="Tu combinación astral"
      >
        <style>{CARD_CSS}</style>
        <rect width={W} height={H} fill="#10131c" />
        <rect x="48" y="48" width={W - 96} height={H - 96} fill="none"
              stroke="#262c3c" strokeWidth="2" />

        <text x={W / 2} y="300" textAnchor="middle" fill="#a9a496"
              className="sc-mono" fontSize="34" letterSpacing="10">
          TU COMBINACIÓN
        </text>

        {rows.map((r, i) => (
          <g key={r.label} transform={`translate(0 ${560 + i * 240})`}>
            <text x={W / 2} y="0" textAnchor="middle" fill="#c9a227"
                  className="sc-display" fontSize="120">
              {SIGN_GLYPH[r.sign]}
            </text>
            <text x={W / 2} y="96" textAnchor="middle" fill="#ece6da"
                  className="sc-display" fontSize="72">
              {SIGN_ES[r.sign]}
            </text>
            <text x={W / 2} y="150" textAnchor="middle" fill="#6e7689"
                  className="sc-mono" fontSize="30" letterSpacing="6">
              {r.label.toUpperCase()}
            </text>
          </g>
        ))}

        <text x={W / 2} y="1500" textAnchor="middle" fill="#b4653a"
              className="sc-mono" fontSize="36">
          1 de {sig.oneIn.toLocaleString("es-ES")} combinaciones
        </text>
        {firstName && (
          <text x={W / 2} y="1570" textAnchor="middle" fill="#6e7689"
                className="sc-body" fontSize="32">
            La carta de {firstName}
          </text>
        )}
        <text x={W / 2} y="1790" textAnchor="middle" fill="#a9a496"
              className="sc-mono" fontSize="30" letterSpacing="8">
          DESTINY REPORTS
        </text>
      </svg>

      <button className="submit" onClick={share} disabled={busy}>
        {busy ? "Preparando…" : "Compartir o guardar"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * SVG → PNG via canvas. The SVG is serialised from the live DOM and loaded as
 * a blob, so it must be self-contained: no external references, and its fonts
 * declared inline (see CARD_CSS). Nothing external is fetched, so the canvas
 * stays untainted and toBlob works.
 */
async function rasterise(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no se pudo rasterizar la tarjeta"));
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
