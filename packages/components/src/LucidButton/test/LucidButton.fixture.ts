import { LucidButtonState } from "../../index.ts";

customElements.whenDefined("lucid-button").then(() => {
  const pick = <T extends HTMLElement>(sel: string) =>
    document.querySelector<T>(sel);

  pick<any>('[data-testid="btn-pending"]')?.setState(LucidButtonState.PENDING, {
    label: "Saving",
  });
  pick<any>('[data-testid="btn-error"]')?.setState(LucidButtonState.ERROR);
  pick<any>('[data-testid="btn-success"]')?.setState(LucidButtonState.SUCCESS);
});
