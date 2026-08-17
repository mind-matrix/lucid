import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import optionCss from "./LucidOption.css" with { type: "text" };

/**
 * `<lucid-option>` — one option inside a `<lucid-select>`.
 *
 * The HOST carries `role="option"` and `aria-selected`, because that is
 * what the parent listbox scans and what screen readers announce. The
 * shadow content is presentational only — deliberately NOT interactive,
 * so we never nest an interactive control inside a `role="option"`.
 *
 * Options are never focusable. `<lucid-select>` implements the ARIA
 * select-only combobox pattern, which keeps DOM focus on the trigger and
 * points `aria-activedescendant` at the highlighted option instead. That
 * is why there is no `tabindex` here.
 */
export class LucidOption extends LucidElement {
  static override styles = [styleSheet(optionCss)];
  static override props: Record<string, PropDef> = {
    value: { type: PropType.STRING, default: "" },
    selected: { type: PropType.BOOLEAN, default: false },
    active: { type: PropType.BOOLEAN, default: false },
    disabled: { type: PropType.BOOLEAN, default: false },
  };

  value: string = "";
  selected: boolean = false;
  active: boolean = false;
  disabled: boolean = false;

  /** Visible text of the option, used by the trigger and by typeahead. */
  get label(): string {
    return this.textContent?.trim() ?? "";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "option");
    }
    this.setAttribute("aria-selected", this.selected ? "true" : "false");
    this.#syncDisabled();
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
      this.#syncDisabled();
    }
  }

  #syncDisabled(): void {
    if (this.disabled) {
      this.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
    }
  }

  protected render(): Node {
    return (
      <div part="control">
        <span part="label">
          <slot />
        </span>
        <svg
          class="check"
          part="check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    );
  }
}

defineElement("lucid-option", LucidOption);
