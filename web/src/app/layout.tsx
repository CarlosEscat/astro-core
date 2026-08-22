import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// General Sans (Fontshare, ITF Free Font License v2.0 — self-hosting
// permitted). Roobert's approved substitute: heavy 700 at large sizes is the
// system's signature, and General Sans is the closest geometric match. The
// four static weights are loaded under one variable name so a later swap to
// real Roobert never touches a call site.
const generalSans = localFont({
  src: [
    { path: "../fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-roobert",
  display: "swap",
});

// Spec decision 10 took "cada frase nombra la posición exacta que la sustenta"
// off the landing; it lived here too, in the browser tab and in every search
// result and link preview. Same reasoning applies, so it goes from both.
export const metadata: Metadata = {
  title: "Destiny Reports — Crea tu carta, descubre tu personaje",
  description:
    "Crea tu carta natal gratis y descubre tu personaje. No es un horóscopo: es tu carta, y no se parece a la de nadie.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-ES"
      className={`${generalSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
