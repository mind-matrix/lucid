import {
  LucidElement,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import navLinkCss from "./LucidNavLink.css" with { type: "text" };

export class LucidNavLink extends LucidElement {
  static override styles = [styleSheet(navLinkCss)];
  static override props: Record<string, PropDef> = {
    href: { type: "string", default: "" },
    target: { type: "string", default: "" },
    rel: { type: "string", default: "" },
    active: { type: "boolean", default: false },
    disabled: { type: "boolean", default: false },
  };

  href: string = "";
  target: string = "";
  rel: string = "";
  active: boolean = false;
  disabled: boolean = false;

  #computedRel(): string | undefined {
    if (this.rel) return this.rel;
    if (this.target === "_blank") return "noopener noreferrer";
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
