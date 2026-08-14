import type { Sign } from "@core/types";
import type { FreeCard } from "@core/card";

export interface Placement { sign: Sign; degree: number; gloss: string }
export interface BigThree { sun: Placement; moon: Placement; ascendant: Placement }
export interface Match { sign: Sign; say: string; why: string }
export type ElementName = "Fuego" | "Tierra" | "Aire" | "Agua";

export interface Elements {
  totals: Record<ElementName, number>;
  /** Keyed to `totals`, so both are safe to index with. */
  dominant: ElementName; weakest: ElementName; total: number;
}
export interface ChartResponse {
  timeZone: string;
  bigThree: BigThree;
  matches: Match[];
  friction: Match;
  elements: Elements;
  ruler: { body: string; sign: Sign; inDomicile: boolean };
  signature: { sun: Sign; moon: Sign; ascendant: Sign; oneIn: number };
  card: FreeCard;
}
export interface FreeReading { apertura: string; amor: string; hook: string }
