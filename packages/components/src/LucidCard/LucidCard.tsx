import { LucidElement, defineElement, styleSheet, type PropDef } from "@mind-matrix/lucid-core";
import cardCss from "./LucidCard.css" with { type: "text" };

export type LucidCardVariant = "outlined" | "filled" | "elevated" | "";

export class LucidCard extends LucidElement {
  static override styles = [styleSheet(cardCss)];
  static override props: Record<string, PropDef> = {
    variant: { type: "string", default: "" },
    clickable: { type: "boolean", default: false },
    disabled: { type: "boolean", default: false },
  };

  variant: LucidCardVariant = "";
  clickable: boolean = false;
  disabled: boolean = false;

  constructor() {
    super();
    this.addEventListener("click", (e) => {
      if (this.clickable && this.disabled) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    });
    this.addEventListener("keydown", (e) => {
      if (!this.clickable || this.disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  }

  protected render(): Node {
    const clickable = this.clickable;
    const disabled = clickable && this.disabled;

    return (
      <article
        class="lucid-card"
        part="root"
        role={clickable ? "button" : undefined}
        tabindex={clickable ? (disabled ? "-1" : "0") : undefined}
        aria-disabled={disabled ? "true" : undefined}
      >
        <slot name="icon" />
        <slot name="title" />
        <slot />
      </article>
    );
  }
}

defineElement("lucid-card", LucidCard);
