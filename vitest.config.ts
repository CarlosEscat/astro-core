import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    // Only the source tests — `npm run build` leaves compiled copies of the
    // test files in dist/, which fail (dist/ has no prompts/ directory).
    include: ["tests/**/*.test.ts", "web/tests/**/*.test.{ts,tsx}"],
    // Only the component tests pay for a DOM; the rest stay in node. Vitest 4
    // removed `environmentMatchGlobs`, so each .tsx test opts in with a
    // `@vitest-environment jsdom` docblock instead.
  },
  resolve: {
    alias: {
      "@core": r("./src"),
      "@/": `${r("./web/src")}/`,
      "server-only": r("./web/node_modules/server-only/empty.js"),
    },
  },
});
