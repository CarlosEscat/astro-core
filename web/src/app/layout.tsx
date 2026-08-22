import type { Metadata } from "next";
import { Bricolage_Grotesque, Karla } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque titles and carries the numbers; Karla is
// everything that gets read. Weight does the work the serif used to.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      className={`${bricolage.variable} ${karla.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
