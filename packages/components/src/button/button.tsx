import { LucidElement, defineElement, styleSheet, type PropDef } from "@mind-matrix/lucid-core";
import buttonCss from "./button.css" with { type: "text" };

export class LucidButton extends LucidElement {
  static override styles = [styleSheet(buttonCss)];
  static override props: Record<string, PropDef> = {
    variant: { type: "string", default: "" },
    disabled: { type: "boolean", default: false },
  };

  variant: string = "";
  disabled: boolean = false;

  constructor() {
    super();
    this.addEventListener("click", (e) => {
      if (this.disabled) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    });
  }

  protected render(): Node {
    return (
      <button disabled={this.disabled}>
        <slot />
      </button>
    );
  }
}

defineElement("lucid-button", LucidButton);
