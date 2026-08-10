import { paragraphsOf, slugify } from "@/lib/report-format";

export interface ReportSection { title: string; body: string }

/**
 * The report itself. Pure: it takes sections and renders them, so the same
 * component serves the preview route, the delivery route, the progressive
 * (partial) state, and later the PDF renderer. It must not fetch, poll or
 * touch browser-only APIs — Puppeteer will render this exact component.
 *
 * Bodies are plain paragraphs by construction (the section prompt forbids
 * lists and bold), and React escapes them, so model output can never inject
 * markup.
 */
export function ReportView({
  sections, firstName,
}: { sections: ReportSection[]; firstName?: string }) {
  return (
    <article className="report">
      {firstName && (
        <p className="report__greeting">
          Para {firstName}, a partir de la carta que calculamos con tus datos.
        </p>
      )}
      {sections.map((s) => (
        <section key={s.title} id={slugify(s.title)} className="report__section">
          <h2 className="report__title">{s.title}</h2>
          {paragraphsOf(s.body).map((p, i) => (
            <p key={i} className="report__p">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
