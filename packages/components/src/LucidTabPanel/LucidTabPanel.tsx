import {
  LucidElement,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import panelCss from "./LucidTabPanel.css" with { type: "text" };

export class LucidTabPanel extends LucidElement {
  static override styles = [styleSheet(panelCss)];
  static override props: Record<string, PropDef> = {
    value: { type: "string", default: "" },
  };

  value: string = "";

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) this.setAttribute("role", "tabpanel");
    // Focusable target so panels can be Tab-reached from the tablist
    // (per WAI-ARIA APG — the panel itself is a tab stop when it has
    // no focusable children; a real content pane usually does, and
    // the browser handles that automatically).
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
  }

  protected render(): Node {
    return <slot />;
  }
}

defineElement("lucid-tab-panel", LucidTabPanel);
