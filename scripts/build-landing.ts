import { rm } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { BunPlugin } from "bun";

const ROOT = new URL("..", import.meta.url).pathname;
const APP = join(ROOT, "apps/landing");
const OUT = join(ROOT, "dist/landing");

const basePath = process.env.BASE_PATH ?? "/";
const normalized = basePath.endsWith("/") ? basePath : basePath + "/";

/**
 * In dev, Bun resolves `@mind-matrix/lucid-*` to their `src/` — that
 * gives HMR against the source. In production we want the pre-built
 * `dist/index.js` outputs (produced by `bun run build`) because the
 * package build inlines component CSS via `with { type: "text" }`.
 * The HTML/JS entrypoint pipeline used here would otherwise extract
 * those CSS imports as separate assets, breaking shadow-DOM styles.
 */
const useBuiltPackages: BunPlugin = {
  name: "use-built-packages",
  setup(build) {
    build.onResolve({ filter: /^@mind-matrix\/lucid-/ }, (args) => {
      // args.path is e.g. "@mind-matrix/lucid-core" or "@mind-matrix/lucid-core/jsx-runtime"
      const parts = args.path.split("/");
      const pkgFull = parts[1]!; // "lucid-core"
      const subpath = parts.slice(2).join("/"); // "" or "jsx-runtime"
      const name = pkgFull.replace(/^lucid-/, "");
      const file = subpath ? `${subpath}.js` : "index.js";
      return { path: join(ROOT, "packages", name, "dist", file) };
    });
  },
};

// Measure library bundle size and write apps/landing/src/generated/bundle-size.ts.
// Runs before Bun.build so the landing bundle picks up the freshly-generated module.
await Bun.$`bun ${join(ROOT, "scripts/bundle-size.ts")} --write`;

await rm(OUT, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [join(APP, "src/main.tsx")],
  outdir: join(OUT, "assets"),
  target: "browser",
  format: "esm",
  splitting: false,
  minify: true,
  sourcemap: "linked",
  publicPath: `${normalized}assets/`,
  plugins: [useBuiltPackages],
  naming: {
    entry: "[name]-[hash].[ext]",
    chunk: "[name]-[hash].[ext]",
    asset: "[name]-[hash].[ext]",
  },
});

if (!result.success) {
  console.error("[build-landing] failed");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const jsAsset = result.outputs.find((o) => o.kind === "entry-point");
const cssAssets = result.outputs.filter((o) => o.path.endsWith(".css"));

if (!jsAsset) {
  console.error("[build-landing] no JS entrypoint produced");
  process.exit(1);
}

const jsHref = `${normalized}assets/${basename(jsAsset.path)}`;
const cssLinks = cssAssets
  .map(
    (c) => `<link rel="stylesheet" href="${normalized}assets/${basename(c.path)}" />`,
  )
  .join("\n    ");

const rawHtml = await Bun.file(join(APP, "index.html")).text();

const finalHtml = rawHtml
  .replace(
    /<link rel="stylesheet" href="\.\/src\/styles\/reset\.css" \/>/,
    `<link rel="stylesheet" href="${normalized}assets/reset.css" />`,
  )
  .replace(
    /<link rel="stylesheet" href="\.\.\/\.\.\/packages\/core\/src\/tokens\.css" \/>/,
    `<link rel="stylesheet" href="${normalized}assets/tokens.css" />`,
  )
  .replace(
    /<link rel="stylesheet" href="\.\/src\/styles\/global\.css" \/>/,
    `<link rel="stylesheet" href="${normalized}assets/global.css" />`,
  )
  .replace(
    /<script type="module" src="\.\/src\/main\.tsx"><\/script>/,
    `${cssLinks}\n    <script type="module" src="${jsHref}"></script>`,
  );

await Bun.write(join(OUT, "index.html"), finalHtml);

for (const cssPath of [
  join(APP, "src/styles/reset.css"),
  join(ROOT, "packages/core/src/tokens.css"),
  join(APP, "src/styles/global.css"),
]) {
  await Bun.write(join(OUT, "assets", basename(cssPath)), await Bun.file(cssPath).text());
}

await Bun.write(join(OUT, ".nojekyll"), "");

console.log(`[build-landing] → ${OUT} (base=${normalized})`);
console.log(`  /index.html`);
for (const o of result.outputs) {
  console.log(`  ${relative(OUT, o.path).padEnd(48)} ${o.size ?? 0} B`);
}
