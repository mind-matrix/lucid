import { rm } from "node:fs/promises";
import { join } from "node:path";
import { compressComponentCss } from "./scripts/plugins/compress-component-css.ts";

const ROOT = import.meta.dir;

const targets = [
  {
    name: "@mind-matrix/lucid-core",
    dir: join(ROOT, "packages/core"),
    // `jsx-dev-runtime` is intentionally absent: `jsxDEV` is exported from
    // jsx-runtime.ts and the package export map points both subpaths at that
    // one bundle, so we don't ship a duplicate ~1.5 KB file.
    entrypoints: ["src/index.ts", "src/jsx-runtime.ts"],
  },
  {
    name: "@mind-matrix/lucid-components",
    dir: join(ROOT, "packages/components"),
    entrypoints: ["src/index.ts"],
    external: ["@mind-matrix/lucid-core"],
  },
  {
    name: "@mind-matrix/lucid-react",
    dir: join(ROOT, "packages/react"),
    entrypoints: ["src/index.ts"],
    external: ["react", "@mind-matrix/lucid-core"],
  },
] as const;

for (const t of targets) {
  const outdir = join(t.dir, "dist");
  await rm(outdir, { recursive: true, force: true });

  for (const entry of t.entrypoints) {
    const result = await Bun.build({
      root: join(t.dir, "src"),
      entrypoints: [join(t.dir, entry)],
      outdir,
      target: "browser",
      format: "esm",
      splitting: false,
      minify: true,
      sourcemap: "linked",
      external: "external" in t ? [...t.external] : [],
      plugins: [compressComponentCss],
    });

    if (!result.success) {
      console.error(`[build] ${t.name} (${entry}) failed`);
      for (const log of result.logs) { console.error(log); }
      process.exit(1);
    }
  }
  console.log(`[build] ${t.name} → ${outdir}`);
}
