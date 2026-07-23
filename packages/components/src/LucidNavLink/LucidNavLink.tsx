import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import { EXTERNAL_LINK_REL, EXTERNAL_LINK_TARGET } from "../utilities";
import navLinkCss from "./LucidNavLink.css" with { type: "text" };

export class LucidNavLink extends LucidElement {
  static override styles = [styleSheet(navLinkCss)];
  static override props: Record<string, PropDef> = {
    href: { type: PropType.STRING, default: "" },
    target: { type: PropType.STRING, default: "" },
    rel: { type: PropType.STRING, default: "" },
    active: { type: PropType.BOOLEAN, default: false },
    disabled: { type: PropType.BOOLEAN, default: false },
  };

  href: string = "";
  target: string = "";
  rel: string = "";
  active: boolean = false;
  disabled: boolean = false;

  #computedRel(): string | undefined {
    if (this.rel) { return this.rel; }
    if (this.target === EXTERNAL_LINK_TARGET) { return EXTERNAL_LINK_REL; }
    return undefined;
  }

  protected render(): Node {
    const isDisabled = this.disabled;
    return (
      <a
        part="control"
        href={isDisabled ? undefined : this.href}
        target={this.target || undefined}
        rel={this.#computedRel()}
        aria-current={this.active ? "page" : undefined}
        aria-disabled={isDisabled ? "true" : undefined}
        tabindex={isDisabled ? "-1" : undefined}
      >
        <slot />
      </a>
    );
  }
}

defineElement("lucid-nav-link", LucidNavLink);
