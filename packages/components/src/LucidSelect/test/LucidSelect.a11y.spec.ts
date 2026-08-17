import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Page = import("@playwright/test").Page;

/** Let the component's microtask-deferred sync land. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

/** Distance from the bottom of the trigger to the top of the open popup. */
const popupGap = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(
      "lucid-select[data-testid='sel-empty']",
    )!;
    const lb = el.shadowRoot!.querySelector<HTMLElement>("[part='listbox']")!;
    return (
      lb.getBoundingClientRect().top - el.getBoundingClientRect().bottom
    );
  });

test.describe("lucid-select — accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/select");
    await page.waitForSelector("lucid-select[data-testid='sel-empty']");
    await settle(page);
  });

  test("axe: no violations, closed and open", async ({ page }) => {
    const closed = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect.soft(closed.violations, format(closed.violations)).toEqual([]);

    // Open one listbox and re-scan — the popup introduces role=listbox and
    // aria-activedescendant, which is where select a11y usually breaks.
    await page.locator("lucid-select[data-testid='sel-empty']").click();
    await settle(page);
    const open = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect.soft(open.violations, format(open.violations)).toEqual([]);
  });

  test("host is the combobox and the single tab stop", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await expect(host).toHaveAttribute("role", "combobox");
    await expect(host).toHaveAttribute("aria-haspopup", "listbox");
    await expect(host).toHaveAttribute("aria-expanded", "false");
    await expect(host).toHaveAttribute("tabindex", "0");
    await expect(host).toHaveAttribute("aria-label", "Framework");

    // Options must NOT be focusable — focus stays on the combobox.
    const optionTabindexes = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          "lucid-select[data-testid='sel-empty'] > lucid-option",
        ),
      ).map((o) => o.getAttribute("tabindex")),
    );
    expect(optionTabindexes).toEqual([null, null, null, null]);
  });

  test("listbox lives in the shadow root and is hidden when closed", async ({
    page,
  }) => {
    const info = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-select[data-testid='sel-empty']",
      )!;
      const lb = host.shadowRoot!.querySelector<HTMLElement>("[part='listbox']")!;
      return {
        role: lb.getAttribute("role"),
        popover: lb.getAttribute("popover"),
        open: lb.hasAttribute("data-open"),
        visible: lb.checkVisibility(),
      };
    });
    expect(info.role).toBe("listbox");
    // "manual" rather than "auto": auto popovers bring their own light
    // dismiss and Escape handling, which would fight the APG contract.
    expect(info.popover).toBe("manual");
    expect(info.open).toBe(false);
    expect(info.visible).toBe(false);
  });

  test("open popup is promoted into the top layer", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);

    const state = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        "lucid-select[data-testid='sel-empty']",
      )!;
      const lb = el.shadowRoot!.querySelector<HTMLElement>("[part='listbox']")!;
      return {
        popoverOpen: lb.matches(":popover-open"),
        visible: lb.checkVisibility(),
        // Top layer or not, the popup must remain a shadow descendant —
        // that is what keeps the slotted options projecting and the ARIA
        // id references resolving.
        stillInShadowRoot: lb.getRootNode() === el.shadowRoot,
        placement: lb.dataset.placement,
      };
    });
    expect(state.popoverOpen).toBe(true);
    expect(state.visible).toBe(true);
    expect(state.stillInShadowRoot).toBe(true);
    expect(state.placement).toBe("block-end");
  });

  test("popup escapes a clipping, fixed-containing-block ancestor", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-clipped']");
    await host.click();
    await settle(page);

    const geometry = await page.evaluate(() => {
      const clipper = document.querySelector<HTMLElement>(
        "[data-testid='clipper']",
      )!;
      const el = document.querySelector<HTMLElement>(
        "lucid-select[data-testid='sel-clipped']",
      )!;
      const lb = el
        .shadowRoot!.querySelector<HTMLElement>("[part='listbox']")!
        .getBoundingClientRect();
      const last = document.querySelector<HTMLElement>(
        "[data-testid='opt-clipped-last']",
      )!;
      const r = last.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      const box = clipper.getBoundingClientRect();
      return {
        // Either placement is fine — what matters is that the popup is not
        // confined to the clipper's box.
        escapesClipper: lb.bottom > box.bottom + 1 || lb.top < box.top - 1,
        height: lb.height,
        topmostIsLastOption: !!hit && (hit === last || last.contains(hit)),
      };
    });

    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.escapesClipper).toBe(true);
    // The decisive check: the far end of the list is genuinely on screen and
    // hit-testable, not painted underneath the clipper or anything else.
    expect(geometry.topmostIsLastOption).toBe(true);
  });

  test("popup follows the trigger when the page scrolls", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);

    const gapBefore = await popupGap(page);
    await page.evaluate(() => window.scrollBy(0, 120));
    // Repositioning is rAF-throttled.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
    const gapAfter = await popupGap(page);

    // A viewport-positioned popup would drift by the full scroll distance
    // if nothing were tracking the anchor.
    expect(Math.abs(gapAfter - gapBefore)).toBeLessThan(2);
  });

  test("placeholder shows when empty, option label shows when selected", async ({
    page,
  }) => {
    const empty = page
      .locator("lucid-select[data-testid='sel-empty']")
      .locator("[part='value']");
    await expect(empty).toHaveText("Select an option");

    const custom = page
      .locator("lucid-select[data-testid='sel-placeholder']")
      .locator("[part='value']");
    await expect(custom).toHaveText("Choose a region…");

    const preselected = page
      .locator("lucid-select[data-testid='sel-preselected']")
      .locator("[part='value']");
    await expect(preselected).toHaveText("Bun");
  });

  test("preselected value marks the matching option aria-selected", async ({
    page,
  }) => {
    const states = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          "lucid-select[data-testid='sel-preselected'] > lucid-option",
        ),
      ).map((o) => ({
        value: o.getAttribute("value"),
        selected: o.getAttribute("aria-selected"),
      })),
    );
    expect(states).toEqual([
      { value: "bun", selected: "true" },
      { value: "deno", selected: "false" },
      { value: "node", selected: "false" },
    ]);
  });

  test("clicking the trigger opens, sets aria-expanded and activedescendant", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);

    await expect(host).toHaveAttribute("aria-expanded", "true");
    await expect(host).toHaveAttribute("open", "");

    // With no value, the first enabled option becomes active.
    const activeId = await host.getAttribute("aria-activedescendant");
    expect(activeId).not.toBe(null);
    const activeValue = await page.evaluate(
      (id: string) => document.getElementById(id)?.getAttribute("value"),
      activeId!,
    );
    expect(activeValue).toBe("astro");
  });

  test("aria-activedescendant resolves to a real element in the same tree", async ({
    page,
  }) => {
    // This is the whole reason the combobox role lives on the host: id
    // references do not cross shadow boundaries.
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);

    const resolves = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        "lucid-select[data-testid='sel-empty']",
      )!;
      const id = el.getAttribute("aria-activedescendant");
      if (!id) {
        return false;
      }
      const target = el.ownerDocument.getElementById(id);
      // Must exist AND be a descendant of the combobox.
      return !!target && el.contains(target);
    });
    expect(resolves).toBe(true);
  });

  test("clicking an option selects it, closes, and emits lucid-value-change", async ({
    page,
  }) => {
    await page.evaluate(() => {
      (window as unknown as { __events: unknown[] }).__events = [];
      document
        .querySelector("lucid-select[data-testid='sel-empty']")!
        .addEventListener("lucid-value-change", (e) => {
          (window as unknown as { __events: unknown[] }).__events.push(
            (e as CustomEvent).detail,
          );
        });
    });

    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-svelte']").click();
    await settle(page);

    await expect(host).toHaveAttribute("value", "svelte");
    await expect(host).toHaveAttribute("aria-expanded", "false");
    await expect(host.locator("[part='value']")).toHaveText("Svelte");

    const events = await page.evaluate(
      () => (window as unknown as { __events: unknown[] }).__events,
    );
    expect(events).toEqual([{ value: "svelte" }]);
  });

  test("keyboard: Enter opens, ArrowDown moves, Enter commits", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.focus();

    await page.keyboard.press("Enter");
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("ArrowDown"); // astro -> react
    await settle(page);
    await page.keyboard.press("Enter");
    await settle(page);

    await expect(host).toHaveAttribute("value", "react");
    await expect(host).toHaveAttribute("aria-expanded", "false");
  });

  test("keyboard: Escape closes without changing the value", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-preselected']");
    await host.focus();
    await page.keyboard.press("ArrowDown");
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("ArrowDown"); // move highlight off "bun"
    await settle(page);
    await page.keyboard.press("Escape");
    await settle(page);

    await expect(host).toHaveAttribute("aria-expanded", "false");
    // Value is unchanged despite the highlight having moved.
    await expect(host).toHaveAttribute("value", "bun");
  });

  test("keyboard: Home and End jump to first and last option", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.focus();
    await page.keyboard.press("ArrowDown");
    await settle(page);

    await page.keyboard.press("End");
    await settle(page);
    let activeId = await host.getAttribute("aria-activedescendant");
    let value = await page.evaluate(
      (id: string) => document.getElementById(id)?.getAttribute("value"),
      activeId!,
    );
    expect(value).toBe("vue");

    await page.keyboard.press("Home");
    await settle(page);
    activeId = await host.getAttribute("aria-activedescendant");
    value = await page.evaluate(
      (id: string) => document.getElementById(id)?.getAttribute("value"),
      activeId!,
    );
    expect(value).toBe("astro");
  });

  test("keyboard: typeahead jumps to a matching option", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.focus();
    // Typing while closed opens and jumps.
    await page.keyboard.press("s");
    await settle(page);

    await expect(host).toHaveAttribute("aria-expanded", "true");
    const activeId = await host.getAttribute("aria-activedescendant");
    const value = await page.evaluate(
      (id: string) => document.getElementById(id)?.getAttribute("value"),
      activeId!,
    );
    expect(value).toBe("svelte");
  });

  test("disabled option is skipped by arrow navigation and ignores clicks", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-disabled-option']");
    await host.focus();
    await page.keyboard.press("ArrowDown"); // opens, active = "free"
    await settle(page);

    await page.keyboard.press("ArrowDown"); // should skip "pro", land on "team"
    await settle(page);
    const activeId = await host.getAttribute("aria-activedescendant");
    const value = await page.evaluate(
      (id: string) => document.getElementById(id)?.getAttribute("value"),
      activeId!,
    );
    expect(value).toBe("team");

    // Clicking the disabled option must not commit it. `force` bypasses
    // Playwright's actionability check, which refuses to click anything
    // marked aria-disabled — we specifically want to prove the component's
    // own guard holds even if a click does get through.
    await page
      .locator("lucid-option[data-testid='opt-pro']")
      .click({ force: true });
    await settle(page);
    expect(await host.getAttribute("value")).not.toBe("pro");
    // …and the listbox stays open, because nothing was committed.
    await expect(host).toHaveAttribute("aria-expanded", "true");
  });

  test("disabled select is not focusable and does not open", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-disabled']");
    await expect(host).toHaveAttribute("aria-disabled", "true");
    await expect(host).not.toHaveAttribute("tabindex", /.*/);

    await host.click({ force: true });
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "false");
  });

  test("clicking outside closes the listbox", async ({ page }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "true");

    await page.locator("h2").first().click();
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "false");
  });

  test("only one option carries the active highlight at a time", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await host.click();
    await settle(page);
    await page.keyboard.press("ArrowDown");
    await settle(page);

    const activeCount = await page.evaluate(
      () =>
        document.querySelectorAll(
          "lucid-select[data-testid='sel-empty'] > lucid-option[active]",
        ).length,
    );
    expect(activeCount).toBe(1);
  });

  test("assigning .value syncs everything but emits no change event", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        "lucid-select[data-testid='sel-empty']",
      ) as HTMLElement & { value: string };
      let events = 0;
      el.addEventListener("lucid-value-change", () => {
        events += 1;
      });
      el.value = "react";
      return { value: el.value, attr: el.getAttribute("value"), events };
    });
    // Matching native <select>: programmatic assignment is not a user
    // change, so it must not announce one.
    expect(result.value).toBe("react");
    expect(result.attr).toBe("react");
    expect(result.events).toBe(0);

    await settle(page);
    const host = page.locator("lucid-select[data-testid='sel-empty']");
    await expect(host.locator("[part='value']")).toHaveText("React");
    await expect(
      page.locator("lucid-option[data-testid='opt-react']"),
    ).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("lucid-select — form association", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/select");
    await page.waitForSelector("lucid-select[data-testid='sel-required']");
    await settle(page);
  });

  test("submits under its name and is skipped when disabled", async ({
    page,
  }) => {
    const entries = await page.evaluate(() =>
      Array.from(
        new FormData(
          document.querySelector("[data-testid='form']") as HTMLFormElement,
        ).entries(),
      ),
    );
    // "addon" lives in a disabled fieldset, so it is barred from submission.
    expect(entries).toEqual([
      ["plan", ""],
      ["seats", "5"],
    ]);

    await page.locator("lucid-select[data-testid='sel-required']").click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-plus']").click();
    await settle(page);

    const after = await page.evaluate(() =>
      Array.from(
        new FormData(
          document.querySelector("[data-testid='form']") as HTMLFormElement,
        ).entries(),
      ),
    );
    expect(after).toEqual([
      ["plan", "plus"],
      ["seats", "5"],
    ]);
  });

  test("required blocks validation until an option is chosen", async ({
    page,
  }) => {
    const read = () =>
      page.evaluate(() => {
        const el = document.querySelector(
          "lucid-select[data-testid='sel-required']",
        ) as HTMLElement & {
          form: HTMLFormElement | null;
          validity: ValidityState;
          validationMessage: string;
          willValidate: boolean;
          checkValidity(): boolean;
        };
        const form = document.querySelector(
          "[data-testid='form']",
        ) as HTMLFormElement;
        return {
          associated: el.form === form,
          willValidate: el.willValidate,
          valueMissing: el.validity.valueMissing,
          message: el.validationMessage,
          selfValid: el.checkValidity(),
          formValid: form.checkValidity(),
        };
      });

    const before = await read();
    expect(before.associated).toBe(true);
    expect(before.willValidate).toBe(true);
    expect(before.valueMissing).toBe(true);
    expect(before.message).toBe("Please select an option.");
    expect(before.selfValid).toBe(false);
    expect(before.formValid).toBe(false);

    await page.locator("lucid-select[data-testid='sel-required']").click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-plus']").click();
    await settle(page);

    const after = await read();
    expect(after.valueMissing).toBe(false);
    expect(after.message).toBe("");
    expect(after.formValid).toBe(true);
  });

  test("aria-required is exposed, and the invalid cue waits for interaction", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-required']");
    await expect(host).toHaveAttribute("aria-required", "true");
    // A freshly loaded form must not be pre-flagged as in error.
    await expect(host).not.toHaveAttribute("data-invalid", /.*/);

    await host.focus();
    await host.blur();
    await settle(page);
    await expect(host).toHaveAttribute("data-invalid", "");

    // Satisfying the constraint clears it again.
    await host.click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-plus']").click();
    await settle(page);
    await expect(host).not.toHaveAttribute("data-invalid", /.*/);
  });

  test("data-value-missing-message localises the validation message", async ({
    page,
  }) => {
    const message = await page.evaluate(() => {
      const el = document.querySelector(
        "lucid-select[data-testid='sel-required']",
      ) as HTMLElement & { value: string; validationMessage: string };
      el.setAttribute("data-value-missing-message", "Choisissez une option.");
      // Re-run the validity sync by moving the value away and back.
      el.value = "plus";
      el.value = "";
      return el.validationMessage;
    });
    expect(message).toBe("Choisissez une option.");
  });

  test("form.reset() restores the value declared in markup", async ({
    page,
  }) => {
    const named = page.locator("lucid-select[data-testid='sel-named']");
    const required = page.locator("lucid-select[data-testid='sel-required']");

    await named.click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-ten']").click();
    await settle(page);
    await expect(named).toHaveAttribute("value", "10");

    await required.click();
    await settle(page);
    await page.locator("lucid-option[data-testid='opt-plus']").click();
    await settle(page);
    await expect(required).toHaveAttribute("value", "plus");

    await page.evaluate(() =>
      (document.querySelector("[data-testid='form']") as HTMLFormElement).reset(),
    );
    await settle(page);

    // Back to the markup default, not to blank.
    await expect(named).toHaveAttribute("value", "5");
    await expect(named.locator("[part='value']")).toHaveText("5");
    // …and back to no selection for the one that never declared a value.
    await expect(required).not.toHaveAttribute("value", /.*/);
    await expect(required.locator("[part='value']")).toHaveText(
      "Select an option",
    );
    // Reset also clears the interacted flag, so the error cue goes away.
    await expect(required).not.toHaveAttribute("data-invalid", /.*/);
  });

  test("an ancestor <fieldset disabled> disables and re-enables the select", async ({
    page,
  }) => {
    const host = page.locator("lucid-select[data-testid='sel-fieldset-disabled']");
    await expect(host).toHaveAttribute("data-disabled", "");
    await expect(host).toHaveAttribute("aria-disabled", "true");
    await expect(host).not.toHaveAttribute("tabindex", /.*/);

    await host.click({ force: true });
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "false");

    // Re-enabling must hand control back — the reason the fieldset state is
    // tracked separately from the `disabled` prop rather than reflected onto
    // the host's own attribute.
    await page.evaluate(() => {
      const fs = document.querySelector(
        "fieldset[disabled]",
      ) as HTMLFieldSetElement;
      fs.disabled = false;
    });
    await settle(page);

    await expect(host).not.toHaveAttribute("data-disabled", /.*/);
    await expect(host).not.toHaveAttribute("aria-disabled", /.*/);
    await expect(host).toHaveAttribute("tabindex", "0");

    await host.click();
    await settle(page);
    await expect(host).toHaveAttribute("aria-expanded", "true");
  });

  test("session state is restored via formStateRestoreCallback", async ({
    page,
  }) => {
    const value = await page.evaluate(() => {
      const el = document.querySelector(
        "lucid-select[data-testid='sel-named']",
      ) as HTMLElement & {
        value: string;
        formStateRestoreCallback(state: string): void;
      };
      el.formStateRestoreCallback("10");
      return el.value;
    });
    expect(value).toBe("10");
    await settle(page);
    await expect(
      page.locator("lucid-select[data-testid='sel-named']").locator("[part='value']"),
    ).toHaveText("10");
  });
});

function format(v: unknown[]): string {
  if (!Array.isArray(v) || v.length === 0) {
    return "no violations";
  }
  return v
    .map(
      (x: any) =>
        `\n  [${x.id}] ${x.help} (${x.impact})\n    ${x.helpUrl}\n    nodes: ${x.nodes
          .map((n: any) => n.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");
}
