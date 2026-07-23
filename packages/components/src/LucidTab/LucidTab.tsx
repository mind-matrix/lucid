import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import tabCss from "./LucidTab.css" with { type: "text" };

export class LucidTab extends LucidElement {
  static override styles = [styleSheet(tabCss)];
  static override props: Record<string, PropDef> = {
    value: { type: PropType.STRING, default: "" },
    selected: { type: PropType.BOOLEAN, default: false },
    disabled: { type: PropType.BOOLEAN, default: false },
  };

  value: string = "";
  selected: boolean = false;
  disabled: boolean = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) { this.setAttribute("role", "tab"); }
    this.setAttribute("aria-selected", this.selected ? "true" : "false");
    if (this.disabled) { this.setAttribute("aria-disabled", "true"); }
    else { this.removeAttribute("aria-disabled"); }
  }

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null,
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === "selected") {
      this.setAttribute("aria-selected", newVal === null ? "false" : "true");
    }
    if (name === "disabled") {
      if (newVal === null) { this.removeAttribute("aria-disabled"); }
      else { this.setAttribute("aria-disabled", "true"); }
    }
  }

  protected render(): Node {
    return (
      <div part="control">
        <slot />
      </div>
    );
  }
}

defineElement("lucid-tab", LucidTab);
