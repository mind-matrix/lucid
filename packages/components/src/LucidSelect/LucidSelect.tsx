import {
  LucidElement,
  PropType,
  defineElement,
  styleSheet,
  type PropDef,
} from "@mind-matrix/lucid-core";
import selectCss from "./LucidSelect.css" with { type: "text" };
import type { LucidOption } from "../LucidOption/LucidOption.tsx";

export type LucidSelectChangeDetail = { value: string };

/** Unique per-instance suffix so option ids never collide across selects. */
let instanceCounter = 0;

const TYPEAHEAD_TIMEOUT_MS = 500;

/** English safety net for `data-value-missing-message`. */
const DEFAULT_VALUE_MISSING_MESSAGE = "Please select an option.";

/**
 * Whether the Popover API is available to promote the listbox into the top
 * layer. When it isn't, the popup still uses `position: fixed` with the
 * same JS-computed coordinates, which escapes `overflow: hidden` on every
 * ancestor that hasn't established a containing block for fixed
 * descendants (`transform`, `filter`, `contain`, …).
 */
const POPOVER_SUPPORTED =
  typeof HTMLElement !== "undefined" &&
  typeof HTMLElement.prototype.showPopover === "function";

/**
 * `<lucid-select>` — a single-select dropdown implementing the ARIA
 * "select-only combobox" pattern.
 *
 * Authoring:
 *   <lucid-select label="Framework" name="framework" value="astro" required>
 *     <lucid-option value="astro">Astro</lucid-option>
 *     <lucid-option value="react">React</lucid-option>
 *     <lucid-option value="vue" disabled>Vue</lucid-option>
 *   </lucid-select>
 *
 * Emits `lucid-value-change` (bubbling, composed) with `{ value }` detail
 * when the user changes the selection — same event name as `<lucid-tabs>`.
 * Assigning `.value` programmatically does *not* emit, matching native
 * `<select>`.
 *
 * ## Why the ARIA lives on the host
 *
 * `aria-activedescendant` must reference an element id, and id references
 * do NOT resolve across a shadow boundary. The options are slotted light-DOM
 * children of this host, so the `role="combobox"` element must also be in
 * the light DOM for the reference to resolve — meaning the HOST is the
 * combobox and the focusable element. The shadow `[part="control"]` is
 * purely presentational, which also avoids nesting an interactive control
 * inside a `role="combobox"`.
 *
 * The shadow `role="listbox"` wraps the `<slot>`, so in the flattened
 * accessibility tree the listbox contains the options.
 *
 * ## The popup lives in the top layer
 *
 * The listbox is a `popover`, so it renders in the top layer and cannot be
 * clipped by an ancestor's `overflow: hidden` or buried by a competing
 * `z-index`. Being in the top layer only changes where the box is *painted*
 * — the element stays a shadow-root descendant in both the DOM and the flat
 * tree, so slotted options keep projecting and the ARIA relationships above
 * keep resolving.
 *
 * Top-layer boxes are positioned against the viewport, so coordinates are
 * computed in JS from the trigger's rect (see `#position`) and refreshed on
 * scroll and resize while open. We use `popover="manual"` rather than
 * `"auto"`: auto popovers bring their own light-dismiss and Escape
 * handling, which would fight the APG keyboard contract implemented here.
 *
 * ## Form association
 *
 * This is a form-associated custom element. With a `name` it submits like a
 * native `<select>`, participates in `FormData`, honours `form.reset()` and
 * session restore, is disabled by an ancestor `<fieldset disabled>`, and
 * supports `required` via the constraint-validation API (`checkValidity`,
 * `reportValidity`, `validity`, `validationMessage`).
 *
 * The `valueMissing` message is internal chrome that cannot be slotted, so
 * it is localised through `data-value-missing-message` with an English
 * fallback.
 *
 * ## Known limitation: aria-controls
 *
 * ARIA requires `aria-controls` on `role="combobox"`, but the listbox lives
 * in this element's shadow root, so the id reference cannot resolve — the
 * same cross-root problem, in the opposite direction.
 *
 * ARIA element reflection (`ariaControlsElements`) is the standards-track
 * fix, but assigning it *clears the `aria-controls` content attribute* by
 * design, which trips validators that require the attribute's presence and
 * loses ground with AT that only reads attributes. We therefore keep the
 * attribute and accept that it does not resolve. In practice AT relies on
 * `aria-expanded` plus the listbox being a DOM descendant of the combobox,
 * which is the arrangement here. Revisit once element reflection has broad
 * AT and tooling support.
 */
export class LucidSelect extends LucidElement {
  static formAssociated = true;

  static override styles = [styleSheet(selectCss)];
  static override props: Record<string, PropDef> = {
    value: { type: PropType.STRING, default: "" },
    placeholder: { type: PropType.STRING, default: "Select an option" },
    label: { type: PropType.STRING, default: "" },
    name: { type: PropType.STRING, default: "" },
    open: { type: PropType.BOOLEAN, default: false },
    disabled: { type: PropType.BOOLEAN, default: false },
    required: { type: PropType.BOOLEAN, default: false },
  };

  placeholder: string = "Select an option";
  label: string = "";
  name: string = "";
  open: boolean = false;
  disabled: boolean = false;
  required: boolean = false;

  /**
   * Assigned as a field initializer so internals exist before any
   * attribute callback can run.
   */
  readonly #internals: ElementInternals = this.attachInternals();

  readonly #uid = `lucid-select-${++instanceCounter}`;
  readonly #listboxId = `${this.#uid}-listbox`;
  #value = "";
  #activeIndex = -1;
  #typeaheadQuery = "";
  #typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  /** Value to restore on `form.reset()` — the one the markup declared. */
  #defaultValue = "";
  #defaultValueCaptured = false;
  /** Disabled by an ancestor `<fieldset disabled>` rather than our own prop. */
  #formDisabled = false;
  /**
   * Whether the user has engaged with the control yet. Gates the visible
   * invalid styling so a `required` select isn't red the moment it loads.
   */
  #touched = false;
  #repositionFrame: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.#defaultValueCaptured) {
      this.#defaultValueCaptured = true;
      this.#defaultValue = this.getAttribute("value") ?? "";
    }

    // The host is the combobox — see the class doc for why.
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "combobox");
    }
    this.setAttribute("aria-haspopup", "listbox");
    this.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.setAttribute("aria-controls", this.#listboxId);
    if (this.label && !this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", this.label);
    }
    // `:disabled` covers an ancestor <fieldset disabled> that was already in
    // place at insertion time, which formDisabledCallback may not report.
    this.#formDisabled = this.matches(":disabled");
    this.#syncDisabled();
    this.#syncRequired();
    this.#internals.setFormValue(this.#value);
    this.#syncValidity();

    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("click", this.#onClick);
    this.addEventListener("blur", this.#onBlur);
    this.addEventListener("invalid", this.#onInvalid);

    queueMicrotask(() => this.#syncOptions());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("blur", this.#onBlur);
    this.removeEventListener("invalid", this.#onInvalid);
    this.#stopTrackingAnchor();
    document.removeEventListener("pointerdown", this.#onDocumentPointerDown);
    if (this.#typeaheadTimer) {
      clearTimeout(this.#typeaheadTimer);
    }
  }

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null,
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === "disabled") {
      this.#syncDisabled();
    }
    if (name === "required") {
      this.#syncRequired();
      this.#syncValidity();
    }
  }

  // ─── Value ───────────────────────────────────────────────────

  /**
   * The selected option's value, or `""` when nothing is selected.
   *
   * An accessor rather than a plain field so programmatic assignment stays
   * in sync with the attribute, the rendered trigger, the submitted form
   * value, and validity — all of which a bare field would silently skip.
   */
  get value(): string {
    return this.#value;
  }

  set value(next: string) {
    const v = next == null ? "" : String(next);
    if (v === this.#value) {
      return;
    }
    this.#value = v;
    // Guard against re-entering via attributeChangedCallback.
    if ((this.getAttribute("value") ?? "") !== v) {
      if (v === "") {
        this.removeAttribute("value");
      } else {
        this.setAttribute("value", v);
      }
    }
    this.#internals.setFormValue(v);
    this.#syncValidity();
    this.#syncOptions();
  }

  // ─── Public API ──────────────────────────────────────────────

  /** The currently selected option, or null when nothing is selected. */
  get selectedOption(): LucidOption | null {
    return this.#options().find((o) => o.value === this.#value) ?? null;
  }

  /** Open the listbox. No-op when disabled or already open. */
  show(): void {
    if (this.#isDisabled() || this.open) {
      return;
    }
    this.open = true;
    this.setAttribute("open", "");
    this.setAttribute("aria-expanded", "true");
    // Highlight the selected option, or the first enabled one.
    const enabled = this.#enabledOptions();
    const selectedIdx = enabled.findIndex((o) => o.value === this.#value);
    this.#setActive(selectedIdx >= 0 ? selectedIdx : 0);
    // Deferred so the click that opened the popup doesn't immediately close it.
    queueMicrotask(() => {
      document.addEventListener("pointerdown", this.#onDocumentPointerDown);
    });
    this.#startTrackingAnchor();
    this.requestUpdate();
  }

  /** Close the listbox without changing the selection. */
  hide(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.removeAttribute("open");
    this.setAttribute("aria-expanded", "false");
    this.#setActive(-1);
    this.#stopTrackingAnchor();
    document.removeEventListener("pointerdown", this.#onDocumentPointerDown);
    this.requestUpdate();
  }

  toggle(): void {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  // ─── Constraint validation (mirrors native form controls) ────

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  get validity(): ValidityState {
    return this.#internals.validity;
  }

  get validationMessage(): string {
    return this.#internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.#internals.willValidate;
  }

  get labels(): NodeList {
    return this.#internals.labels;
  }

  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  // ─── Form lifecycle ──────────────────────────────────────────

  /**
   * `form.reset()`. Restores the value the markup declared and clears the
   * interacted flag, so the control goes back to looking untouched. No
   * `lucid-value-change` — native controls don't fire change on reset.
   */
  formResetCallback(): void {
    this.#touched = false;
    this.value = this.#defaultValue;
    this.#syncValidity();
  }

  /** Session restore / back-forward cache. */
  formStateRestoreCallback(state: string | File | FormData): void {
    if (typeof state === "string") {
      this.value = state;
    }
  }

  /**
   * Fired when the *effective* disabled state changes, which includes an
   * ancestor `<fieldset disabled>`. Tracked separately from the `disabled`
   * prop: reflecting it onto our own attribute would leave the control
   * stuck disabled after the fieldset re-enables.
   */
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    if (disabled) {
      this.hide();
    }
    this.#syncDisabled();
  }

  // ─── Option access ───────────────────────────────────────────

  #options(): LucidOption[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(":scope > lucid-option"),
    ) as unknown as LucidOption[];
  }

  #enabledOptions(): LucidOption[] {
    return this.#options().filter(
      (o) => (o as unknown as HTMLElement).getAttribute("aria-disabled") !== "true",
    );
  }

  #control(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>("[part='control']") ?? null;
  }

  #listbox(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>("[part='listbox']") ?? null;
  }

  // ─── State sync ──────────────────────────────────────────────

  /** True when disabled by our own prop OR by an ancestor fieldset. */
  #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  #syncDisabled(): void {
    const off = this.#isDisabled();
    if (off) {
      this.setAttribute("data-disabled", "");
      this.setAttribute("aria-disabled", "true");
      this.removeAttribute("tabindex");
    } else {
      this.removeAttribute("data-disabled");
      this.removeAttribute("aria-disabled");
      // The host is the single tab stop for the whole widget.
      if (!this.hasAttribute("tabindex")) {
        this.setAttribute("tabindex", "0");
      }
    }
  }

  #syncRequired(): void {
    if (this.required) {
      this.setAttribute("aria-required", "true");
    } else {
      this.removeAttribute("aria-required");
    }
  }

  #syncValidity(): void {
    const missing = this.required && this.#value === "";
    if (missing) {
      this.#internals.setValidity(
        { valueMissing: true },
        this.getAttribute("data-value-missing-message") ??
          DEFAULT_VALUE_MISSING_MESSAGE,
        this.#control() ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
    // Colour alone can't carry the error (WCAG 1.4.1) — the accessible
    // description comes from the platform's validation message, surfaced by
    // reportValidity() or a failed submit. This is a supplementary cue, and
    // it waits for interaction so a fresh form isn't pre-flagged red.
    if (missing && this.#touched) {
      this.setAttribute("data-invalid", "");
    } else {
      this.removeAttribute("data-invalid");
    }
  }

  #syncOptions(): void {
    const options = this.#options();
    options.forEach((option, i) => {
      const el = option as unknown as HTMLElement & LucidOption;
      // Stable ids are required for aria-activedescendant to reference them.
      if (!el.id) {
        el.id = `${this.#uid}-option-${i}`;
      }
      const isSelected = el.value === this.#value && this.#value !== "";
      el.selected = isSelected;
      if (isSelected) {
        el.setAttribute("selected", "");
      } else {
        el.removeAttribute("selected");
      }
    });
    // Placeholder styling hook for the trigger.
    if (this.#value === "") {
      this.setAttribute("data-placeholder", "");
    } else {
      this.removeAttribute("data-placeholder");
    }
    this.requestUpdate();
  }

  /** @param index Index into the *enabled* options, or -1 to clear. */
  #setActive(index: number): void {
    this.#activeIndex = index;
    const enabled = this.#enabledOptions();
    const active = index >= 0 ? enabled[index] : undefined;

    for (const option of this.#options()) {
      const el = option as unknown as HTMLElement & LucidOption;
      const isActive = active !== undefined && el === (active as unknown as HTMLElement);
      el.active = isActive;
      if (isActive) {
        el.setAttribute("active", "");
      } else {
        el.removeAttribute("active");
      }
    }

    if (active) {
      const el = active as unknown as HTMLElement;
      this.setAttribute("aria-activedescendant", el.id);
      // A no-op while the popup is still hidden — which is the case when
      // show() seeds the highlight before its render lands. `updated()`
      // scrolls again once the popup is actually on screen.
      el.scrollIntoView({ block: "nearest" });
    } else {
      this.removeAttribute("aria-activedescendant");
    }
  }

  /** Apply a user-driven selection: updates the value and announces it. */
  #commit(next: string): void {
    this.#touched = true;
    if (next === this.#value) {
      this.#syncValidity();
      return;
    }
    this.value = next;
    this.dispatchEvent(
      new CustomEvent<LucidSelectChangeDetail>("lucid-value-change", {
        detail: { value: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Commit the highlighted option and close. */
  #commitActive(): void {
    const enabled = this.#enabledOptions();
    const active = this.#activeIndex >= 0 ? enabled[this.#activeIndex] : undefined;
    if (active) {
      this.#commit(active.value);
    }
    this.hide();
  }

  #moveActive(delta: number): void {
    const count = this.#enabledOptions().length;
    if (count === 0) {
      return;
    }
    let next = this.#activeIndex + delta;
    if (next < 0) {
      next = count - 1;
    } else if (next >= count) {
      next = 0;
    }
    this.#setActive(next);
  }

  #typeahead(char: string): void {
    this.#typeaheadQuery += char.toLowerCase();
    if (this.#typeaheadTimer) {
      clearTimeout(this.#typeaheadTimer);
    }
    this.#typeaheadTimer = setTimeout(() => {
      this.#typeaheadQuery = "";
    }, TYPEAHEAD_TIMEOUT_MS);

    const enabled = this.#enabledOptions();
    const query = this.#typeaheadQuery;
    const start = this.#activeIndex < 0 ? 0 : this.#activeIndex;
    // Search forward from the current option, wrapping around.
    for (let step = 0; step < enabled.length; step++) {
      const idx = (start + step) % enabled.length;
      if (enabled[idx]!.label.toLowerCase().startsWith(query)) {
        this.#setActive(idx);
        return;
      }
    }
  }

  // ─── Popup placement ─────────────────────────────────────────

  /**
   * Re-assert the popup's imperative state after a render.
   *
   * `render()` hands back a fresh listbox element every time, and removing
   * the old one drops it out of the top layer — so top-layer promotion,
   * viewport coordinates, and the scroll offset of the highlighted option
   * all have to be re-applied here rather than in `show()`.
   */
  protected override updated(): void {
    const listbox = this.#listbox();
    if (!listbox) {
      return;
    }

    if (!this.open || !this.isConnected) {
      if (POPOVER_SUPPORTED && listbox.matches(":popover-open")) {
        listbox.hidePopover();
      }
      listbox.removeAttribute("data-open");
      return;
    }

    listbox.setAttribute("data-open", "");
    if (POPOVER_SUPPORTED && !listbox.matches(":popover-open")) {
      listbox.showPopover();
    }
    this.#position(listbox);

    const active = this.querySelector<HTMLElement>(":scope > lucid-option[active]");
    active?.scrollIntoView({ block: "nearest" });
  }

  /**
   * Place the popup against the trigger's viewport rect.
   *
   * Top-layer boxes ignore their DOM ancestors for positioning, so there is
   * no CSS-only way to say "under the trigger" without CSS anchor
   * positioning, which isn't available everywhere yet. Distances stay in CSS
   * as tokens: JS only publishes measurements (`px`) and a placement flag,
   * and the stylesheet does the arithmetic.
   */
  #position(listbox: HTMLElement): void {
    const anchor = this.getBoundingClientRect();
    const viewportInline = document.documentElement.clientWidth;
    const viewportBlock = document.documentElement.clientHeight;
    const rtl = getComputedStyle(this).direction === "rtl";

    const roomAfter = viewportBlock - anchor.bottom;
    const roomBefore = anchor.top;

    // Measure against the roomier side first, so the flip decision isn't
    // made from a height that was already clamped to the losing side.
    listbox.style.setProperty(
      "--lucid-select-available-block-size",
      `${Math.max(roomBefore, roomAfter)}px`,
    );
    const flip = roomAfter < listbox.offsetHeight && roomBefore > roomAfter;

    listbox.style.setProperty(
      "--lucid-select-available-block-size",
      `${flip ? roomBefore : roomAfter}px`,
    );
    listbox.dataset.placement = flip ? "block-start" : "block-end";

    listbox.style.inlineSize = `${anchor.width}px`;
    // For a fixed-position box `inset-inline-start` resolves to `left` in
    // LTR and `right` in RTL, hence the two different measurements.
    listbox.style.insetInlineStart = `${rtl ? viewportInline - anchor.right : anchor.left}px`;
    if (flip) {
      listbox.style.insetBlockStart = "auto";
      listbox.style.insetBlockEnd = `${viewportBlock - anchor.top}px`;
    } else {
      listbox.style.insetBlockEnd = "auto";
      listbox.style.insetBlockStart = `${anchor.bottom}px`;
    }
  }

  /**
   * A viewport-positioned popup doesn't move with its trigger, so track
   * anything that could shift the trigger while the popup is open. `capture`
   * is required to observe scrolling of nested scroll containers, which
   * don't bubble their scroll events.
   */
  #startTrackingAnchor(): void {
    window.addEventListener("scroll", this.#onReposition, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", this.#onReposition, { passive: true });
  }

  #stopTrackingAnchor(): void {
    window.removeEventListener("scroll", this.#onReposition, { capture: true });
    window.removeEventListener("resize", this.#onReposition);
    if (this.#repositionFrame !== null) {
      cancelAnimationFrame(this.#repositionFrame);
      this.#repositionFrame = null;
    }
  }

  #onReposition = () => {
    if (this.#repositionFrame !== null) {
      return;
    }
    this.#repositionFrame = requestAnimationFrame(() => {
      this.#repositionFrame = null;
      const listbox = this.#listbox();
      if (listbox && this.open) {
        this.#position(listbox);
      }
    });
  };

  // ─── Event handlers ──────────────────────────────────────────

  #onClick = (e: MouseEvent) => {
    if (this.#isDisabled()) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    // Clicking an option commits it.
    const option = (e.target as Element | null)?.closest("lucid-option");
    if (option && option.parentElement === this) {
      const o = option as unknown as LucidOption;
      if (o.disabled) {
        return;
      }
      this.#commit(o.value);
      this.hide();
      this.focus();
      return;
    }
    // Otherwise the click landed on the trigger.
    this.toggle();
  };

  #onBlur = () => {
    this.#touched = true;
    this.#syncValidity();
  };

  /**
   * Fired when a submit attempt or `reportValidity()` finds this control
   * invalid — proof of interaction, so the visible cue may show.
   */
  #onInvalid = () => {
    this.#touched = true;
    this.#syncValidity();
  };

  #onDocumentPointerDown = (e: PointerEvent) => {
    // composedPath() sees through the shadow boundary, so this correctly
    // ignores clicks on our own trigger and listbox.
    if (e.composedPath().includes(this)) {
      return;
    }
    this.hide();
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (this.#isDisabled()) {
      return;
    }
    const { key, altKey } = e;

    if (!this.open) {
      // Closed: these keys open the listbox.
      if (
        key === "Enter" ||
        key === " " ||
        key === "ArrowDown" ||
        key === "ArrowUp" ||
        (altKey && key === "ArrowDown")
      ) {
        e.preventDefault();
        this.show();
        return;
      }
      if (key === "Home" || key === "End") {
        e.preventDefault();
        this.show();
        this.#setActive(key === "Home" ? 0 : this.#enabledOptions().length - 1);
        return;
      }
      if (key.length === 1 && /\S/.test(key)) {
        e.preventDefault();
        this.show();
        this.#typeahead(key);
      }
      return;
    }

    // Open.
    switch (key) {
      case "ArrowDown":
        e.preventDefault();
        this.#moveActive(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        this.#moveActive(-1);
        return;
      case "Home":
        e.preventDefault();
        this.#setActive(0);
        return;
      case "End":
        e.preventDefault();
        this.#setActive(this.#enabledOptions().length - 1);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        this.#commitActive();
        return;
      case "Escape":
        e.preventDefault();
        this.hide();
        return;
      case "Tab":
        // Per APG: Tab commits the highlighted option, then focus moves on
        // naturally — so this deliberately does NOT preventDefault.
        this.#commitActive();
        return;
      default:
        if (key.length === 1 && /\S/.test(key)) {
          e.preventDefault();
          this.#typeahead(key);
        }
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  protected render(): Node {
    const selected = this.selectedOption;
    const display = selected ? selected.label : this.placeholder;

    return (
      <>
        <div part="control">
          <span part="value">{display}</span>
          <svg
            part="indicator"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <div
          part="listbox"
          role="listbox"
          id={this.#listboxId}
          popover={POPOVER_SUPPORTED ? "manual" : null}
        >
          <slot />
        </div>
      </>
    );
  }
}

defineElement("lucid-select", LucidSelect);
