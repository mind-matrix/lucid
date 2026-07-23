import { LucidElement, defineElement } from "@mind-matrix/lucid-core";
import "./footer.css";

export class LucidFooter extends LucidElement {
  static override shadow: ShadowRootMode | false = false;

  protected render(): Node {
    return (
      <footer class="footer">
        Built with Lucid · MIT
      </footer>
    );
  }
}

defineElement("lucid-footer", LucidFooter);
