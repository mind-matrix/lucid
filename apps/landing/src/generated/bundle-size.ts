/**
 * Bundle size numbers, generated at build time by
 * `scripts/measure-bundle-size.ts`. Do not edit by hand — regenerated
 * on every `bun run build:landing`. In dev, these values may be stale
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
  componentsGzip: { formatted: "3.1 KB", bytes: 3170 },
  componentsAndRuntimeGzip: { formatted: "5.7 KB", bytes: 5787 },
  generatedAt: "2026-07-23T03:37:33.564Z",
};
