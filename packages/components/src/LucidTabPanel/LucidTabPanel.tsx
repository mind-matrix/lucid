import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import panelCss from "./LucidTabPanel.css" with { type: "text" };

export class LucidTabPanel extends LucidElement {
  static override styles = [styleSheet(panelCss)];
  static override props: Record<string, PropDef> = {
    value: { type: PropType.STRING, default: "" },
  };

  value: string = "";

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) { this.setAttribute("role", "tabpanel"); }
    if (!this.hasAttribute("tabindex")) { this.setAttribute("tabindex", "0"); }
  }

  protected render(): Node {
    return <slot />;
  }
}

defineElement("lucid-tab-panel", LucidTabPanel);
