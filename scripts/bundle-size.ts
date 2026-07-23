/**
 * Bundle size accounting — single source of truth for both:
 *
 *   1. The dev-facing report (`bun run bundle-size`): a per-file table
 *      showing raw, gzip, and brotli bytes across every built package.
 *
 *   2. The landing site's generated module
 *      (`apps/landing/src/generated/bundle-size.ts`), consumed by the
 *      features section so the "X KB gzipped" copy is always current.
 *
 * Modes (mutually inclusive — omit both to run everything):
 *   --report  Print the per-file table to stdout.
 *   --write   Regenerate the landing's bundle-size.ts module.
 *
 * Called from scripts/build-landing.ts (as `--write`) before the site
 * bundle is produced. Requires that `bun run build` has already
 * produced each package's dist/.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname;
const PACKAGES = ["core", "components", "react"] as const;

// What a real consumer downloads to run a lucid component in production:
//   - packages/components/dist/index.js  (component classes + their CSS text)
//   - packages/core/dist/index.js        (LucidElement, signals, css helpers)
//   - packages/core/dist/jsx-runtime.js  (production JSX runtime)
// jsx-dev-runtime.js is only used by TSC during type-checking / dev.
const CONSUMER_FILES = {
  core: ["index.js", "jsx-runtime.js"],
  components: ["index.js"],
} as const;

const args = new Set(process.argv.slice(2));
const doReport = args.has("--report") || args.size === 0;
const doWrite = args.has("--write") || args.size === 0;

const fmt = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(2)} KB`);
const fmtCompact = (n: number) => {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
};
const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

type FileSizes = { raw: number; gzip: number; brotli: number };

async function measure(path: string): Promise<FileSizes | null> {
  try {
    const raw = statSync(path).size;
    const bytes = await Bun.file(path).bytes();
    const buf = Buffer.from(bytes);
    return {
      raw,
      gzip: gzipSync(buf, { level: 9 }).length,
      brotli: brotliCompressSync(buf).length,
    };
  } catch {
    return null;
  }
}

async function measureAll() {
  type Row = { pkg: string; file: string; sizes: FileSizes };
  const rows: Row[] = [];
  const missingPackages: string[] = [];

  for (const pkg of PACKAGES) {
    const dir = join(ROOT, "packages", pkg, "dist");
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".js"));
    } catch {
      missingPackages.push(pkg);
      continue;
    }
    for (const f of files.sort()) {
      const sizes = await measure(join(dir, f));
      if (sizes) rows.push({ pkg, file: f, sizes });
    }
  }
  return { rows, missingPackages };
}

async function report() {
  const { rows, missingPackages } = await measureAll();

  console.log(pad("file", 46) + pad("raw", 12) + pad("gzip", 12) + "brotli");
  console.log("-".repeat(78));

  const totals = { raw: 0, gzip: 0, brotli: 0 };
  for (const r of rows) {
    totals.raw += r.sizes.raw;
    totals.gzip += r.sizes.gzip;
    totals.brotli += r.sizes.brotli;
    console.log(
      pad(`@mind-matrix/lucid-${r.pkg}/${r.file}`, 46) +
        pad(fmt(r.sizes.raw), 12) +
        pad(fmt(r.sizes.gzip), 12) +
        fmt(r.sizes.brotli),
    );
  }
  for (const p of missingPackages) {
    console.log(`(${p}: no dist — run \`bun run build\` first)`);
  }

  console.log("-".repeat(78));
  console.log(
    pad("TOTAL", 46) +
      pad(fmt(totals.raw), 12) +
      pad(fmt(totals.gzip), 12) +
      fmt(totals.brotli),
  );
}

async function write() {
  const coreGz = (
    await Promise.all(
      CONSUMER_FILES.core.map(async (f) => {
        const m = await measure(join(ROOT, "packages/core/dist", f));
        return m?.gzip ?? 0;
      }),
    )
  ).reduce((a, b) => a + b, 0);

  const componentsGz =
    (await measure(join(ROOT, "packages/components/dist/index.js")))?.gzip ?? 0;

  if (componentsGz === 0) {
    console.error(
      "[bundle-size] components/dist is missing — run `bun run build` first",
    );
    process.exit(1);
  }

  const combined = coreGz + componentsGz;

  const output = `/**
 * Bundle size numbers, generated at build time by
 * \`scripts/bundle-size.ts --write\`. Do not edit by hand —
 * regenerated on every \`bun run build:landing\`. In dev, these
 * values may be stale until the packages are rebuilt.
 */

export type BundleSize = {
  /** Human-readable label, e.g. "2.5 KB" */
  formatted: string;
  /** Raw byte count */
  bytes: number;
};

export type BundleSizeReport = {
  componentsGzip: BundleSize;
  componentsAndRuntimeGzip: BundleSize;
  generatedAt: string;
};

export const bundleSize: BundleSizeReport = {
  componentsGzip: { formatted: ${JSON.stringify(fmtCompact(componentsGz))}, bytes: ${componentsGz} },
  componentsAndRuntimeGzip: { formatted: ${JSON.stringify(fmtCompact(combined))}, bytes: ${combined} },
  generatedAt: ${JSON.stringify(new Date().toISOString())},
};
`;

  const outPath = join(ROOT, "apps/landing/src/generated/bundle-size.ts");
  await Bun.write(outPath, output);

  console.log(
    `[bundle-size] components=${fmtCompact(componentsGz)} gzip, ` +
      `+runtime=${fmtCompact(combined)} gzip → ${outPath.replace(ROOT, "")}`,
  );
}

if (doReport) await report();
if (doWrite) {
  if (doReport) console.log(); // blank line between the two sections
  await write();
}
