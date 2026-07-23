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
  componentsGzip: { formatted: "3.3 KB", bytes: 3378 },
  componentsAndRuntimeGzip: { formatted: "5.9 KB", bytes: 5995 },
  generatedAt: "2026-07-23T11:26:47.033Z",
};
