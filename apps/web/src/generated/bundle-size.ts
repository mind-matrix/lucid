/**
 * Bundle size numbers, generated at build time by
 * `scripts/bundle-size.ts --write`. Do not edit by hand —
 * regenerated on every `bun run build:landing`. In dev, these
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
  componentsGzip: { formatted: "5.7 KB", bytes: 5842 },
  componentsAndRuntimeGzip: { formatted: "9.0 KB", bytes: 9231 },
  generatedAt: "2026-07-23T16:28:21.332Z",
};
