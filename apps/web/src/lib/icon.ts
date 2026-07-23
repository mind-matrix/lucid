import type { IconNode } from "lucide";

type SvgAttrs = Record<string, string | number | undefined>;

const DEFAULT_ATTRS: SvgAttrs = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
  focusable: "false",
};

/**
 * Serialize a Lucide IconNode to an SVG string at build time.
 *
 * Astro renders `.astro` files in Node, where lucide's `createElement`
 * (which returns a browser `SVGElement`) doesn't work. This helper
 * emits the same visual output as a plain string that we can drop
 * into HTML via `set:html`, so icons ship as pre-rendered SVG in the
 * static HTML — no client-side JS needed to render them.
 */
export function iconToSvg(node: IconNode, overrides: SvgAttrs = {}): string {
  const attrs = { ...DEFAULT_ATTRS, ...overrides };
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
    .join(" ");

  const children = node
    .map(
      ([tag, tagAttrs]) =>
        `<${tag} ${Object.entries(tagAttrs)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
          .join(" ")} />`,
    )
    .join("");

  return `<svg ${attrStr}>${children}</svg>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
