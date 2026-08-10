import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { parseReport } from "@core/report";
import { ReportView } from "@/components/ReportView";
import { ReportIndex } from "@/components/ReportIndex";
import { readingMinutes } from "@/lib/report-format";

// No `runtime` export: 'nodejs' is the default in Next 16 and the docs tell you
// to remove it (the edge runtime is deprecated).
export const dynamic = "force-dynamic";

const DIR = join(process.cwd(), "..", "bakeoff-out", "sections");

/**
 * Development-only preview of the reports plan 1's battery wrote to disk.
 * It exists so the report can be designed and judged before plans 2 and 3
 * make a real one reachable — and so the "is a 3,000-word report the product
 * we want" question in HANDOVER Addendum 12 can be answered by looking at one.
 *
 * Deliberately NOT the delivery route: no token, no order, no payment.
 */
export default async function PreviewReport(
  { params }: { params: Promise<{ chart: string }> },
) {
  // Never serve battery output from production — it is not anybody's report.
  if (process.env.NODE_ENV === "production") notFound();

  // params is a Promise since Next 15; awaiting it is required, not optional.
  const { chart } = await params;
  if (!/^[a-z0-9-]+$/.test(chart)) notFound();   // no path traversal

  let markdown: string;
  try {
    markdown = readFileSync(join(DIR, `${chart}.md`), "utf8");
  } catch {
    const available = readdirSync(DIR).filter((f) => f.endsWith(".md"));
    return (
      <main className="shell">
        <p className="error">No existe {chart}. Disponibles: {available.join(", ")}</p>
      </main>
    );
  }

  const parsed = parseReport(markdown);
  if (!parsed) {
    return <main className="shell"><p className="error">parseReport devolvió null.</p></main>;
  }

  return (
    <main className="shell">
      <p className="report__meta">
        {chart} · {parsed.wordCount.toLocaleString("es-ES")} palabras ·
        {" "}{readingMinutes(parsed.wordCount)} min de lectura
      </p>
      <ReportIndex sections={parsed.sections} />
      <ReportView sections={parsed.sections} firstName="Lucía" />
    </main>
  );
}
