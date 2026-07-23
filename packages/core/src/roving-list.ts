import { LucidElement } from "./element.ts";

export type RovingOrientation = "horizontal" | "vertical" | "both";

export type RovingListOptions = {
  /** Which arrow keys move focus. `both` accepts up/down/left/right. */
  orientation?: RovingOrientation;
  /** Whether focus wraps around at the ends. */
  wrap?: boolean;
  /** Enable single-character type-ahead search. */
  typeahead?: boolean;
  /** How long a typeahead query is remembered (ms). */
  typeaheadTimeout?: number;
};

const DEFAULT_OPTIONS: Required<RovingListOptions> = {
  orientation: "horizontal",
  wrap: true,
  typeahead: false,
  typeaheadTimeout: 500,
};

/**
 * Base class for composite widgets whose items share ONE tab stop and
 * traverse via arrow keys — the "roving tabindex" ARIA pattern.
 *
 * Subclasses implement `getRovingItems()` to return the focusable
 * descendants (in document order). This class handles:
 *
 *   - Keeping exactly one item with `tabindex="0"` (rest at `-1`)
 *   - ArrowLeft/Right or ArrowUp/Down (per orientation) to move focus
 *   - Home / End to jump to first / last
 *   - Optional wrap-around at ends
 *   - Optional type-ahead (single character focuses next matching item)
 *
 * Subclasses may override `onActiveChange(el)` to react to focus moves
 * (e.g. update aria-selected). By default this class is focus-only —
 * activation is the subclass's responsibility.
 */
export abstract class LucidRovingList extends LucidElement {
  static rovingOptions: RovingListOptions = {};

  #typeaheadQuery = "";
  #typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  #options(): Required<RovingListOptions> {
    const ctor = this.constructor as typeof LucidRovingList;
    return { ...DEFAULT_OPTIONS, ...ctor.rovingOptions };
  }

  protected abstract getRovingItems(): HTMLElement[];

  /** Called when arrow-key focus lands on a new item. Override to react. */
  protected onRovingFocus(_el: HTMLElement, _index: number): void {}

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("focusin", this.#onFocusIn);
    queueMicrotask(() => this.syncRovingTabIndex());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("focusin", this.#onFocusIn);
    if (this.#typeaheadTimer) { clearTimeout(this.#typeaheadTimer); }
  }

  /** Ensure exactly one item has tabindex=0. Safe to call after DOM mutations. */
  syncRovingTabIndex(): void {
    const items = this.getRovingItems();
    if (items.length === 0) { return; }
    const activeIndex = items.findIndex((it) => it.tabIndex === 0);
    const active = activeIndex >= 0 ? activeIndex : 0;
    for (let i = 0; i < items.length; i++) {
      items[i]!.tabIndex = i === active ? 0 : -1;
    }
  }

  #onFocusIn = (e: Event) => {
    const items = this.getRovingItems();
    const target = e.target as HTMLElement | null;
    if (!target) { return; }
    const idx = items.indexOf(target);
    if (idx === -1) { return; }
    for (let i = 0; i < items.length; i++) {
      items[i]!.tabIndex = i === idx ? 0 : -1;
    }
  };

  #onKeyDown = (e: KeyboardEvent) => {
    const opts = this.#options();
    const items = this.getRovingItems();
    if (items.length === 0) { return; }

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) { return; }

    const next = this.#nextIndex(e.key, currentIndex, items.length, opts);
    if (next === null) { return; }

    e.preventDefault();
    this.#focusItem(items, next);
  };

  #nextIndex(
    key: string,
    current: number,
    length: number,
    opts: Required<RovingListOptions>,
  ): number | null {
    const horizontal =
      opts.orientation === "horizontal" || opts.orientation === "both";
    const vertical =
      opts.orientation === "vertical" || opts.orientation === "both";

    let delta = 0;
    if (horizontal && key === "ArrowRight") { delta = 1; }
    else if (horizontal && key === "ArrowLeft") { delta = -1; }
    else if (vertical && key === "ArrowDown") { delta = 1; }
    else if (vertical && key === "ArrowUp") { delta = -1; }
    else if (key === "Home") { return 0; }
    else if (key === "End") { return length - 1; }
    else if (opts.typeahead && key.length === 1 && /\S/.test(key)) {
      return this.#typeahead(key, current);
    } else { return null; }

    let next = current + delta;
    if (next < 0) { next = opts.wrap ? length - 1 : 0; }
    else if (next >= length) { next = opts.wrap ? 0 : length - 1; }
    return next;
  }

  #typeahead(char: string, current: number): number | null {
    const opts = this.#options();
    this.#typeaheadQuery += char.toLowerCase();
    if (this.#typeaheadTimer) { clearTimeout(this.#typeaheadTimer); }
    this.#typeaheadTimer = setTimeout(() => {
      this.#typeaheadQuery = "";
    }, opts.typeaheadTimeout);

    const items = this.getRovingItems();
    const query = this.#typeaheadQuery;
    // Search starting after the current item, wrapping around.
    for (let step = 1; step <= items.length; step++) {
      const idx = (current + step) % items.length;
      const text = items[idx]!.textContent?.trim().toLowerCase() ?? "";
      if (text.startsWith(query)) { return idx; }
    }
    return null;
  }

  #focusItem(items: HTMLElement[], index: number): void {
    for (let i = 0; i < items.length; i++) {
      items[i]!.tabIndex = i === index ? 0 : -1;
    }
    const el = items[index]!;
    el.focus();
    this.onRovingFocus(el, index);
  }
}
