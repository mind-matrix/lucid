// @ts-check
import { defineConfig } from "astro/config";

// Deploys go under a repo path on GitHub Pages (e.g. /lucid/). The CI
// workflow passes the repo name via BASE_PATH so we don't need to hardcode.
// Local `astro dev` uses "/" so links work at http://localhost:4321/.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  site: process.env.SITE_URL,
  build: {
    // Emit one HTML file per route directory (e.g. /docs/index.html).
    // GitHub Pages serves the directory index natively for clean URLs.
    format: "directory",
  },
  vite: {
    resolve: {
      // Astro's Vite bundler resolves workspace packages via package.json
      // conditions. Prefer the pre-built dist/index.js — its CSS is already
      // inlined via `with { type: "text" }` (see build.ts). Reading source
      // directly would trigger the same shadow-DOM CSS extraction bug we
      // hit with the old build-landing.ts pipeline.
      conditions: ["import", "module", "browser", "default"],
    },
  },
});
