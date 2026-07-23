import { ButtonState } from "../../index.ts";

customElements.whenDefined("lucid-button").then(() => {
  const pick = <T extends HTMLElement>(sel: string) =>
    document.querySelector<T>(sel);

  pick<any>('[data-testid="btn-pending"]')?.setState(ButtonState.PENDING, {
    label: "Saving",
  });
  pick<any>('[data-testid="btn-error"]')?.setState(ButtonState.ERROR);
  pick<any>('[data-testid="btn-success"]')?.setState(ButtonState.SUCCESS);
});
