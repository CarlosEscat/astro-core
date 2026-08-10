import { slugify } from "@/lib/report-format";
import type { ReportSection } from "./ReportView";

/**
 * A ~3,000-word report is a 15-minute read (HANDOVER Addendum 12 measured
 * 2877-3071 words). Without an index the buyer meets a wall of prose and has
 * no way back to the section they wanted.
 */
export function ReportIndex({ sections }: { sections: ReportSection[] }) {
  return (
    <nav className="rindex" aria-label="Secciones del informe">
      <ol className="rindex__list">
        {sections.map((s, i) => (
          <li key={s.title} className="rindex__item">
            <a className="rindex__link" href={`#${slugify(s.title)}`}>
              {/* Decorative: the <ol> already conveys the ordering, and left
                  exposed the ordinal lands inside the link's accessible name
                  ("03Amor y vínculos"). */}
              <span className="rindex__num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="rindex__name">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
