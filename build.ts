import { rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dir;

const targets = [
  {
    name: "@mind-matrix/lucid-core",
    dir: join(ROOT, "packages/core"),
    entrypoints: [
      "src/index.ts",
      "src/jsx-runtime.ts",
      "src/jsx-dev-runtime.ts",
    ],
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

  const result = await Bun.build({
    root: join(t.dir, "src"),
    entrypoints: t.entrypoints.map((e) => join(t.dir, e)),
    outdir,
    target: "browser",
    format: "esm",
    splitting: false,
    minify: true,
    sourcemap: "linked",
    external: "external" in t ? [...t.external] : [],
  });

  if (!result.success) {
    console.error(`[build] ${t.name} failed`);
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  console.log(`[build] ${t.name} → ${outdir}`);
}
