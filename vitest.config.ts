import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the source tests — `npm run build` leaves compiled copies of the
    // test files in dist/, which fail (dist/ has no prompts/ directory).
    include: ["tests/**/*.test.ts"],
  },
});
