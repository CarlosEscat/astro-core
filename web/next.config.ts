import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app imports the astro-core package sources from the repo root
  // (see "@core/*" in tsconfig.json), one directory up.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
