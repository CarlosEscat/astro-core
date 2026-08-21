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

export const metadata: Metadata = {
  title: "Destiny Reports — Tu carta natal, leída de verdad",
  description:
    "Lectura gratuita de tu carta natal calculada de verdad: cada frase nombra la posición exacta que la sustenta.",
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
