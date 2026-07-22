import { rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const APP = join(ROOT, "apps/landing");
const OUT = join(ROOT, "dist/landing");

const basePath = process.env.BASE_PATH ?? "/";
const normalized = basePath.endsWith("/") ? basePath : basePath + "/";

await rm(OUT, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [join(APP, "index.html")],
  outdir: OUT,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: true,
  sourcemap: "linked",
  publicPath: normalized,
  naming: {
    entry: "[name].[ext]",
    chunk: "assets/[name]-[hash].[ext]",
    asset: "assets/[name]-[hash].[ext]",
  },
});

if (!result.success) {
  console.error("[build-landing] failed");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await Bun.write(join(OUT, ".nojekyll"), "");

console.log(`[build-landing] → ${OUT} (base=${normalized})`);
for (const o of result.outputs) {
  const size = o.size ?? 0;
  console.log(`  ${o.path.replace(OUT, "").padEnd(48)} ${size} B`);
}
