import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import { LucidOrientation } from "../utilities";
import navCss from "./LucidNav.css" with { type: "text" };

export class LucidNav extends LucidElement {
  static override styles = [styleSheet(navCss)];
  static override props: Record<string, PropDef> = {
    orientation: { type: PropType.STRING, default: LucidOrientation.HORIZONTAL },
    label: { type: PropType.STRING, default: "" },
  };

  orientation = LucidOrientation.HORIZONTAL;
  label: string = "";

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) { this.setAttribute("role", "navigation"); }
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
