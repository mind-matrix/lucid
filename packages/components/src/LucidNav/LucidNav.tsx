import {
  LucidElement,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import navCss from "./LucidNav.css" with { type: "text" };

export type LucidNavOrientation = "horizontal" | "vertical";

export class LucidNav extends LucidElement {
  static override styles = [styleSheet(navCss)];
  static override props: Record<string, PropDef> = {
    orientation: { type: "string", default: "horizontal" },
    label: { type: "string", default: "" },
  };

  orientation: LucidNavOrientation = "horizontal";
  label: string = "";

  override connectedCallback(): void {
    super.connectedCallback();
    // <nav> already implies role=navigation, but our shadow-DOM <nav>
    // wouldn't count as a landmark on the host without an explicit role.
    // Setting role on the host also makes the landmark discoverable to
    // landmark-navigation shortcuts in screen readers.
    if (!this.hasAttribute("role")) this.setAttribute("role", "navigation");
    if (this.label && !this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", this.label);
    }
  }

  protected render(): Node {
    return (
      <nav part="root">
        <slot />
      </nav>
    );
  }
}

defineElement("lucid-nav", LucidNav);
