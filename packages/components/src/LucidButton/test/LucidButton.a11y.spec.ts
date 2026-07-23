import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("lucid-button — accessibility", () => {
  test("axe: no violations across variants and states", async ({ page }) => {
    await page.goto("/button");
    await page.waitForSelector("lucid-button[data-testid='btn-primary']");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect.soft(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test("keyboard: Tab reaches enabled buttons, skips disabled, Enter/Space activate", async ({
    page,
  }) => {
    await page.goto("/button");
    await page.waitForSelector("lucid-button[data-testid='btn-primary']");

    await page.evaluate(() => {
      (window as any).__clicks = [];
      for (const btn of document.querySelectorAll("lucid-button")) {
        btn.addEventListener("click", (e) => {
          const testid = (e.currentTarget as HTMLElement).dataset.testid;
          (window as any).__clicks.push(testid);
        });
      }
    });

    await page.locator("body").focus();
    await page.keyboard.press("Tab");

    let focused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.testid,
    );
    expect(focused).toBe("btn-default");

    await page.keyboard.press("Enter");
    let clicks = await page.evaluate(() => (window as any).__clicks);
    expect(clicks).toContain("btn-default");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    focused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.testid,
    );
    expect(focused).toBe("btn-ghost");

    await page.keyboard.press("Tab");
    focused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.testid,
    );
    expect(focused).not.toBe("btn-disabled");

    if (focused === "btn-focusable") {
      await page.keyboard.press("Space");
      clicks = await page.evaluate(() => (window as any).__clicks);
      expect(clicks).toContain("btn-focusable");
    }
  });

  test("disabled button suppresses click propagation", async ({ page }) => {
    await page.goto("/button");
    await page.waitForSelector("lucid-button[data-testid='btn-disabled']");

    const bubbled = await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>(
        "lucid-button[data-testid='btn-disabled']",
      )!;
      let fired = false;
      document.body.addEventListener(
        "click",
        (e) => {
          if (e.target === el || (e.target as Element)?.closest?.("lucid-button") === el) {
            fired = true;
          }
        },
        { capture: false },
      );
      el.click();
      return fired;
    });

    expect(bubbled).toBe(false);
  });

  test("icon-only button has accessible name via aria-label", async ({ page }) => {
    await page.goto("/button");
    const iconBtn = page.locator("lucid-button[data-testid='btn-icon']");
    await expect(iconBtn).toHaveAttribute("aria-label", "Close dialog");
  });

  test("setState(PENDING) sets aria-busy, disables click, exposes label", async ({ page }) => {
    await page.goto("/button");
    await page.waitForSelector("lucid-button[data-testid='btn-pending']");

    const internal = page.locator("lucid-button[data-testid='btn-pending']").locator("button");
    await expect(internal).toHaveAttribute("aria-busy", "true");
    await expect(internal).toHaveAttribute("disabled", "");
    await expect(internal).toHaveAttribute("data-state", "pending");

    const spinnerLabel = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-button[data-testid='btn-pending']",
      )!;
      return host.shadowRoot!
        .querySelector('[role="status"]')
        ?.getAttribute("aria-label");
    });
    expect(spinnerLabel).toBe("Saving");

    const clickCount = await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>(
        "lucid-button[data-testid='btn-pending']",
      )!;
      let n = 0;
      el.addEventListener("click", () => n++);
      el.click();
      return n;
    });
    expect(clickCount).toBe(0);
  });

  test("setState(ERROR) sets aria-invalid and data-state=error", async ({ page }) => {
    await page.goto("/button");
    const internal = page.locator("lucid-button[data-testid='btn-error']").locator("button");
    await expect(internal).toHaveAttribute("aria-invalid", "true");
    await expect(internal).toHaveAttribute("data-state", "error");
  });

  test("setState(SUCCESS) exposes data-state=success", async ({ page }) => {
    await page.goto("/button");
    const internal = page.locator("lucid-button[data-testid='btn-success']").locator("button");
    await expect(internal).toHaveAttribute("data-state", "success");
  });

  test("setState transitions re-render the button on the fly", async ({ page }) => {
    await page.goto("/button");
    await page.waitForSelector("lucid-button[data-testid='btn-primary']");

    const stateSequence = await page.evaluate(async () => {
      const el = document.querySelector<any>("lucid-button[data-testid='btn-primary']")!;
      const observed: string[] = [];
      const settle = () => new Promise((r) => queueMicrotask(() => r(null)));
      const read = () =>
        observed.push(
          el.shadowRoot.querySelector("button").getAttribute("data-state") ?? "",
        );

      el.setState("pending");
      await settle();
      read();
      el.setState("success");
      await settle();
      read();
      el.setState("idle");
      await settle();
      read();
      return observed;
    });

    expect(stateSequence).toEqual(["pending", "success", "idle"]);
  });
});

function formatViolations(v: unknown[]): string {
  if (!Array.isArray(v) || v.length === 0) return "no violations";
  return v
    .map(
      (x: any) =>
        `\n  [${x.id}] ${x.help} (${x.impact})\n    ${x.helpUrl}\n    nodes: ${x.nodes
          .map((n: any) => n.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");
}
