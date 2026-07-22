import { LucidElement, defineElement } from "@mind-matrix/lucid-core";
import "./features.css";

type Feature = { icon: string; title: string; body: string };

const FEATURES: Feature[] = [
  {
    icon: "◇",
    title: "Framework-agnostic",
    body:
      "Web Components render natively in React, Vue, Angular, Astro, Svelte, and vanilla HTML.",
  },
  {
    icon: "◉",
    title: "Style-isolated",
    body:
      "Shadow DOM guarantees your CSS can't leak out and outer CSS can't leak in. Theme via CSS custom properties.",
  },
  {
    icon: "≡",
    title: "No VDOM",
    body:
      "JSX compiles straight to document.createElement. Signals wire reactivity in place.",
  },
  {
    icon: "◐",
    title: "Sub-3KB gzipped",
    body:
      "The runtime, button, and React interop combined weigh less than a favicon.",
  },
  {
    icon: "⚡",
    title: "Bun-native",
    body:
      "Ships as ESM. Built, tested, and served with Bun — no webpack, no Vite, no bundler config.",
  },
  {
    icon: "◈",
    title: "Rust-compatible",
    body:
      "WASM apps consume lucid components through standard JS interop. Same DOM API, no bridge.",
  },
];

export class LucidFeatures extends LucidElement {
  static override shadow: ShadowRootMode | false = false;

  protected render(): Node {
    return (
      <section class="features" id="features">
        <h2 class="features__title">Built for interop</h2>
        <div class="features__grid">
          {FEATURES.map((f) => (
            <article class="feature">
              <div class="feature__icon" aria-hidden="true">{f.icon}</div>
              <h3 class="feature__title">{f.title}</h3>
              <p class="feature__body">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }
}

defineElement("lucid-features", LucidFeatures);
