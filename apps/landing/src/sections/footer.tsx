import { LucidElement, defineElement } from "@mind-matrix/lucid-core";
import "./footer.css";

export class LucidFooter extends LucidElement {
  static override shadow: ShadowRootMode | false = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // Page-level "contentinfo" landmark (site-wide footer).
    if (!this.hasAttribute("role")) this.setAttribute("role", "contentinfo");
  }

  protected render(): Node {
    return (
      <footer class="footer">
        Built with Lucid · MIT
      </footer>
    );
  }
}

defineElement("lucid-footer", LucidFooter);
