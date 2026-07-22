import { LucidElement, defineElement } from "@mind-matrix/lucid-core";
import "./hero.css";

export class LucidHero extends LucidElement {
  static override shadow: ShadowRootMode | false = false;

  protected render(): Node {
    return (
      <section class="hero">
        <span class="hero__eyebrow">@mind-matrix/lucid</span>
        <h1 class="hero__title">
          One component library.
          <br />
          <span class="hero__title-accent">Every framework.</span>
        </h1>
        <p class="hero__subtitle">
          Tiny, framework-agnostic UI primitives built on Web Components. Drop
          them into React, Vue, Angular, Astro, Svelte, or vanilla HTML — no
          wrappers, no runtime, no lock-in.
        </p>
        <div class="hero__ctas">
          <lucid-button
            variant="primary"
            onclick={() => {
              document
                .querySelector("lucid-features")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Explore
          </lucid-button>
          <lucid-button variant="ghost">
            <a
              href="https://github.com/mind-matrix/lucid"
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>
          </lucid-button>
        </div>
      </section>
    );
  }
}

defineElement("lucid-hero", LucidHero);
