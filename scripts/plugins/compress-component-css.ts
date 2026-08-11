import { transform } from "lightningcss";
import type { BunPlugin } from "bun";

/**
 * Minify component CSS before it is inlined into the JS bundle as a text
 * import. Uses lightningcss — the same Rust-based engine Vite and Parcel
 * use for CSS minification.
 *
 * ## Why lightningcss is invoked directly rather than via `minify: true`
 *
 * `Bun.build({ minify: true })` also minifies CSS via lightningcss, but it
 * applies aggressive default browser targets, which *downlevel* logical
 * properties: `inset-inline` expands into a wall of
 * `:lang(ae), :lang(ar), ...` direction-detection selectors with
 * `-webkit-any` / `-moz-any` / `:is` variants for older engines. Lucid uses
 * logical properties everywhere by policy (CI rejects physical ones), so
 * that pass *grew* LucidTab.css from 2.4 KB to 3.6 KB, and Bun exposes no
 * option to disable it.
 *
 * Calling lightningcss ourselves with no `targets` skips the downlevel pass
 * entirely while keeping the real minification (~30% off). Lucid already
 * requires modern browsers — Shadow DOM, adoptedStyleSheets, constructable
 * stylesheets — so legacy fallbacks are dead weight.
 *
 * Verified to preserve every construct lucid depends on: `:host()`,
 * `::slotted()`, `@keyframes`, `@media (prefers-reduced-motion)`, the full
 * logical-property set, `break-inside` / `break-before`,
 * `print-color-adjust`, `var()` fallbacks, and `calc()` spacing.
 */
export function compressCss(css: string, filename = "component.css"): string {
  const { code } = transform({
    filename,
    code: new TextEncoder().encode(css),
    minify: true,
    // No `targets` — see the note above. Omitting it disables the
    // legacy-fallback downleveling that would balloon logical properties.
  });
  return new TextDecoder().decode(code);
}

/**
 * Applies {@link compressCss} to any `.css` file under
 * `packages/components/` that is imported as text.
 *
 * Only used by `Bun.build` in `build.ts`. The published `dist/` already
 * carries the minified text inline, so downstream bundlers (Vite/Astro)
 * need no equivalent plugin.
 */
export const compressComponentCss: BunPlugin = {
  name: "compress-component-css",
  setup(build) {
    build.onLoad(
      { filter: /packages[/\\]components[/\\].*\.css$/ },
      async (args) => ({
        contents: compressCss(await Bun.file(args.path).text(), args.path),
        loader: "text",
      }),
    );
  },
};
