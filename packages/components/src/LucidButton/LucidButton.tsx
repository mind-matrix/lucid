import { LucidElement, defineElement, styleSheet, type PropDef } from "@mind-matrix/lucid-core";
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

export class LucidButton extends LucidElement {
  static override styles = [styleSheet(buttonCss)];
  static override props: Record<string, PropDef> = {
    variant: { type: "string", default: "" },
    disabled: { type: "boolean", default: false },
  };

  variant: string = "";
  disabled: boolean = false;

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
    if (state === this.#state && detail?.label === this.#stateLabel) return;
    this.#state = state;
    this.#stateLabel = detail?.label;
    this.requestUpdate();
  }

  protected render(): Node {
    const state = this.#state;
    const isPending = state === LucidButtonState.PENDING;
    const isError = state === LucidButtonState.ERROR;
    const isSuccess = state === LucidButtonState.SUCCESS;

    return (
      <button
        part="control"
        data-state={state}
        disabled={this.disabled || isPending}
        aria-busy={isPending ? "true" : undefined}
        aria-invalid={isError ? "true" : undefined}
        aria-live={state === LucidButtonState.IDLE ? undefined : "polite"}
      >
        {isPending && (
          <span
            class="lucid-btn-spinner"
            role="status"
            aria-label={this.#stateLabel ?? "Loading"}
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
      </button>
    );
  }
}

defineElement("lucid-button", LucidButton);
