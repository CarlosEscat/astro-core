/**
 * A section body is always plain paragraphs: prompts/system-section.md forbids
 * lists, bullets and bold, so there is no markdown to parse. This is the same
 * treatment BirthForm already gives the free reading.
 */
export function paragraphsOf(body: string): string[] {
  return body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Anchor id for a Spanish section title. Accents are stripped, not encoded. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    // The combining diacritical marks NFD just split off. Written as escapes
    // because a literal range of invisible combining characters is unreadable
    // and survives copy-paste badly.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
