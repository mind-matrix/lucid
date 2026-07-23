import { LucidElement, defineElement } from "@mind-matrix/lucid-core";
import "@mind-matrix/lucid-components";
import {
  Blocks,
  Boxes,
  Feather,
  Package,
  Shield,
  Zap,
  createElement as createLucideIcon,
  type IconNode,
} from "lucide";
import { bundleSize } from "../generated/bundle-size.ts";
import "./features.css";

type Feature = { icon: IconNode; title: string; body: string };

const SIZE = bundleSize.componentsAndRuntimeGzip.formatted;

const FEATURES: Feature[] = [
  {
    icon: Boxes,
    title: "Framework-agnostic",
    body:
      "Web Components render natively in React, Vue, Angular, Astro, Svelte, and vanilla HTML.",
  },
  {
    icon: Shield,
    title: "Style-isolated",
    body:
      "Shadow DOM guarantees your CSS can't leak out and outer CSS can't leak in. Theme via CSS custom properties.",
  },
  {
    icon: Zap,
    title: "No Virtual DOM",
    body:
      "JSX compiles straight to document.createElement. Signals wire reactivity in place.",
  },
  {
    icon: Feather,
    title: `${SIZE} gzipped`,
    body:
      `The runtime and every shipped component combined - measured live at build time, currently ${SIZE} over the wire.`,
  },
  {
    icon: Package,
    title: "Bun-native",
    body:
      "Ships as ESM. Built, tested, and served with Bun - no webpack, no Vite, no bundler config.",
  },
  {
    icon: Blocks,
    title: "Rust-compatible",
    body:
      "WASM apps consume lucid components through standard JS interop. Same DOM API, no bridge.",
  },
];

function renderIcon(node: IconNode): SVGElement {
  return createLucideIcon(node, {
    width: 20,
    height: 20,
    "stroke-width": 2,
    "aria-hidden": "true",
    focusable: "false",
  });
}

export class LucidFeatures extends LucidElement {
  static override shadow: ShadowRootMode | false = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // Named region landmark. `aria-labelledby` points at the H2 rendered
    // below so screen readers announce the region with its heading name.
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-labelledby", "lucid-features-heading");
    }
  }

  protected render(): Node {
    return (
      <section class="features" id="features">
        <h2 class="features__title" id="lucid-features-heading">Built for interops</h2>
        <div class="features__grid">
          {FEATURES.map((f) => (
            <lucid-card clickable>
              <div slot="icon" aria-hidden="true">{renderIcon(f.icon)}</div>
              <h3 slot="title">{f.title}</h3>
              <p>{f.body}</p>
            </lucid-card>
          ))}
        </div>
      </section>
    );
  }
}

defineElement("lucid-features", LucidFeatures);
