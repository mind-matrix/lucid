/**
 * Measure gzipped size of the built library packages and write the
 * result to apps/landing/src/generated/bundle-size.ts so the landing
 * can display an always-current number.
 *
 * Called from scripts/build-landing.ts before Bun.build runs.
 * Requires that `bun run build` has already produced each package's dist/.
 */

import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname;

async function gzippedFile(path: string): Promise<number> {
  try {
    const bytes = await Bun.file(path).bytes();
    return gzipSync(Buffer.from(bytes), { level: 9 }).length;
  } catch {
    return 0;
  }
}

async function gzippedFiles(paths: string[]): Promise<number> {
  const sizes = await Promise.all(paths.map(gzippedFile));
  return sizes.reduce((a, b) => a + b, 0);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
}

// What a real consumer downloads to run a lucid component in production:
//   - packages/components/dist/index.js  (component classes + their CSS text)
//   - packages/core/dist/index.js        (LucidElement, signals, css helpers)
//   - packages/core/dist/jsx-runtime.js  (production JSX runtime)
// jsx-dev-runtime.js is only used by TSC during type-checking / dev.
const [coreGz, componentsGz] = await Promise.all([
  gzippedFiles([
    join(ROOT, "packages/core/dist/index.js"),
    join(ROOT, "packages/core/dist/jsx-runtime.js"),
  ]),
  gzippedFile(join(ROOT, "packages/components/dist/index.js")),
]);

if (componentsGz === 0) {
  console.error(
    "[measure-bundle-size] components/dist is missing — run `bun run build` first",
  );
  process.exit(1);
}

const combined = coreGz + componentsGz;

const output = `/**
 * Bundle size numbers, generated at build time by
 * \`scripts/measure-bundle-size.ts\`. Do not edit by hand — regenerated
 * on every \`bun run build:landing\`. In dev, these values may be stale
 * until the packages are rebuilt.
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
  componentsGzip: { formatted: ${JSON.stringify(formatBytes(componentsGz))}, bytes: ${componentsGz} },
  componentsAndRuntimeGzip: { formatted: ${JSON.stringify(formatBytes(combined))}, bytes: ${combined} },
  generatedAt: ${JSON.stringify(new Date().toISOString())},
};
`;

const outPath = join(ROOT, "apps/landing/src/generated/bundle-size.ts");
await Bun.write(outPath, output);

console.log(
  `[measure-bundle-size] components=${formatBytes(componentsGz)} gzip, ` +
    `+runtime=${formatBytes(combined)} gzip → ${outPath.replace(ROOT, "")}`,
);
