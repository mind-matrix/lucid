import {
  LucidRovingList,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
  type RovingListOptions,
} from "@mind-matrix/lucid-core";
import tabsCss from "./LucidTabs.css" with { type: "text" };
import type { LucidTab } from "../LucidTab/LucidTab.tsx";
import type { LucidTabPanel } from "../LucidTabPanel/LucidTabPanel.tsx";
import { LucidOrientation } from "../utilities/constants.ts";

export type LucidTabsActivation = "automatic" | "manual";
export type LucidTabsChangeDetail = { value: string };

/**
 * `<lucid-tabs>` — tablist + tabpanels container.
 *
 * Authoring:
 *   <lucid-tabs value="overview">
 *     <lucid-tab slot="tab" value="overview">Overview</lucid-tab>
 *     <lucid-tab slot="tab" value="usage">Usage</lucid-tab>
 *     <lucid-tab-panel value="overview">…</lucid-tab-panel>
 *     <lucid-tab-panel value="usage">…</lucid-tab-panel>
 *   </lucid-tabs>
 *
 * Tabs go in the named "tab" slot (visually the tablist row at top).
 * Panels go in the default slot (rendered below the tablist).
 *
 * Emits `lucid-value-change` (bubbling, composed) with { value } detail
 * when the selected tab changes.
 */
export class LucidTabs extends LucidRovingList {
  static override styles = [styleSheet(tabsCss)];
  static override props: Record<string, PropDef> = {
    value: { type: PropType.STRING, default: "" },
    orientation: { type: PropType.STRING, default: LucidOrientation.HORIZONTAL },
    activation: { type: PropType.STRING, default: "automatic" },
    label: { type: PropType.STRING, default: "" },
  };

  value: string = "";
  orientation: LucidOrientation = LucidOrientation.HORIZONTAL;
  activation: LucidTabsActivation = "automatic";
  label: string = "";

  static override rovingOptions: RovingListOptions = {
    orientation: LucidOrientation.HORIZONTAL,
    wrap: true,
  };

  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => this.#syncSelection());
    this.addEventListener("click", this.#onClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("click", this.#onClick);
  }

  #getTabs(): LucidTab[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(":scope > lucid-tab"),
    ) as unknown as LucidTab[];
  }

  #getPanels(): LucidTabPanel[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(":scope > lucid-tab-panel"),
    ) as unknown as LucidTabPanel[];
  }

  protected override getRovingItems(): HTMLElement[] {
    return this.#getTabs().filter(
      (t) => (t as unknown as HTMLElement).getAttribute("aria-disabled") !== "true",
    ) as unknown as HTMLElement[];
  }

  protected override onRovingFocus(el: HTMLElement): void {
    if (this.activation === "automatic") {
      const value = (el as unknown as LucidTab).value;
      if (value) { this.#setValue(value); }
    }
  }

  #onClick = (e: MouseEvent) => {
    const tab = (e.target as Element | null)?.closest("lucid-tab");
    if (!tab || tab.parentElement !== this) { return; }
    const t = tab as unknown as LucidTab;
    if (t.disabled) { return; }
    this.#setValue(t.value);
    (tab as HTMLElement).focus();
  };

  #setValue(next: string): void {
    if (next === this.value) { return; }
    this.value = next;
    this.setAttribute("value", next);
    this.#syncSelection();
    this.dispatchEvent(
      new CustomEvent<LucidTabsChangeDetail>("lucid-value-change", {
        detail: { value: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #syncSelection(): void {
    const tabs = this.#getTabs();
    if (tabs.length === 0) { return; }

    let value = this.value;
    if (!value) {
      const first = tabs.find(
        (t) =>
          (t as unknown as HTMLElement).getAttribute("aria-disabled") !==
          "true",
      );
      value = first?.value ?? "";
      if (value) {
        this.value = value;
        this.setAttribute("value", value);
      }
    }

    for (const tab of tabs) {
      const el = tab as unknown as HTMLElement & LucidTab;
      const isSelected = el.value === value;
      el.selected = isSelected;
      if (isSelected) {
        el.setAttribute("selected", "");
      } else {
        el.removeAttribute("selected");
      }

      el.setAttribute("data-orientation", this.orientation);

      const panel = this.#panelFor(el.value);
      if (panel) {
        if (!panel.id) {
          panel.id = `lucid-tab-panel-${el.value}`;
        }
        el.setAttribute("aria-controls", panel.id);
        if (!el.id) {
          el.id = `lucid-tab-${el.value}`;
        }
        panel.setAttribute("aria-labelledby", el.id);
      }
    }

    for (const panel of this.#getPanels()) {
      const p = panel as unknown as HTMLElement & LucidTabPanel;
      p.hidden = p.value !== value;
    }

    // Roving tabindex — the selected tab is the single tab stop.
    const selectedIndex = tabs.findIndex((t) => t.value === value);
    for (let i = 0; i < tabs.length; i++) {
      (tabs[i] as unknown as HTMLElement).tabIndex =
        i === selectedIndex ? 0 : -1;
    }
  }

  #panelFor(value: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(
      `:scope > lucid-tab-panel[value="${CSS.escape(value)}"]`,
    );
  }

  protected render(): Node {
    const ariaLabel = this.label || undefined;
    const ariaOrientation =
      this.orientation === "vertical" ? "vertical" : undefined;
    return (
      <>
        <div
          class="tablist"
          part="tablist"
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation={ariaOrientation}
        >
          <slot name="tab" />
        </div>
        <div class="panels" part="panels">
          <slot />
        </div>
      </>
    );
  }
}

defineElement("lucid-tabs", LucidTabs);
