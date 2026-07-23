import { LucidElement, PropType, defineElement, styleSheet, type PropDef } from "@mind-matrix/lucid-core";
import { EXTERNAL_LINK_REL, EXTERNAL_LINK_TARGET } from "../utilities";
import buttonCss from "./LucidButton.css" with { type: "text" };

export enum LucidButtonState {
  IDLE = "idle",
  PENDING = "pending",
  ERROR = "error",
  SUCCESS = "success",
}

export type LucidButtonStateDetail = {
  /** Screen-reader announcement while in this state. Falls back to a default per state. */
  label?: string;
};

const DEFAULT_LOADING_TEXT = "Loading";

export class LucidButton extends LucidElement {
  static override styles = [styleSheet(buttonCss)];
  static override props: Record<string, PropDef> = {
    variant: { type: PropType.STRING, default: "" },
    disabled: { type: PropType.BOOLEAN, default: false },
    href: { type: PropType.STRING, default: "" },
    target: { type: PropType.STRING, default: "" },
    rel: { type: PropType.STRING, default: "" },
  };

  variant: string = "";
  disabled: boolean = false;
  href: string = "";
  target: string = "";
  rel: string = "";

  #state: LucidButtonState = LucidButtonState.IDLE;
  #stateLabel: string | undefined;

  constructor() {
    super();
    this.addEventListener("click", (e) => {
      if (this.disabled || this.#state === LucidButtonState.PENDING) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    });
  }

  getState(): LucidButtonState {
    return this.#state;
  }

  setState(state: LucidButtonState, detail?: LucidButtonStateDetail): void {
    if (state === this.#state && detail?.label === this.#stateLabel) { return; }
    this.#state = state;
    this.#stateLabel = detail?.label;
    this.requestUpdate();
  }

  #computedRel(): string | undefined {
    if (this.rel) { return this.rel; }
    // Safe default for external links: prevent tab-nabbing and referrer leaks.
    if (this.target === EXTERNAL_LINK_TARGET) { return EXTERNAL_LINK_REL; }
    return undefined;
  }

  protected render(): Node {
    const state = this.#state;
    const isPending = state === LucidButtonState.PENDING;
    const isError = state === LucidButtonState.ERROR;
    const isSuccess = state === LucidButtonState.SUCCESS;
    const isInactive = this.disabled || isPending;
    const isLink = this.href !== "";

    const chrome = (
      <>
        {isPending && (
          <span
            class="lucid-btn-spinner"
            role="status"
            aria-label={this.#stateLabel ?? DEFAULT_LOADING_TEXT}
          />
        )}
        {isError && (
          <span class="lucid-btn-icon lucid-btn-icon-error" aria-hidden="true">
            !
          </span>
        )}
        {isSuccess && (
          <span class="lucid-btn-icon lucid-btn-icon-success" aria-hidden="true">
            ✓
          </span>
        )}
        <span class="lucid-btn-label" aria-hidden={isPending ? "true" : undefined}>
          <slot />
        </span>
      </>
    );

    if (isLink) {
      return (
        <a
          part="control"
          data-state={state}
          href={isInactive ? undefined : this.href}
          target={this.target || undefined}
          rel={this.#computedRel()}
          role="button"
          aria-disabled={isInactive ? "true" : undefined}
          aria-busy={isPending ? "true" : undefined}
          aria-invalid={isError ? "true" : undefined}
          aria-live={state === LucidButtonState.IDLE ? undefined : "polite"}
          tabindex={isInactive ? "-1" : undefined}
        >
          {chrome}
        </a>
      );
    }

    return (
      <button
        part="control"
        data-state={state}
        disabled={isInactive}
        aria-busy={isPending ? "true" : undefined}
        aria-invalid={isError ? "true" : undefined}
        aria-live={state === LucidButtonState.IDLE ? undefined : "polite"}
      >
        {chrome}
      </button>
    );
  }
}

defineElement("lucid-button", LucidButton);
