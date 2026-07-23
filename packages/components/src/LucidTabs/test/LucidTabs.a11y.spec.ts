import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("lucid-tabs — accessibility", () => {
  test("axe: no violations", async ({ page }) => {
    await page.goto("/tabs");
    await page.waitForSelector("lucid-tabs[data-testid='tabs-auto']");
    // Give the container a beat to run its microtask-deferred selection sync.
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect.soft(results.violations, format(results.violations)).toEqual([]);
  });

  test("internal tablist element has role=tablist + aria-label from prop", async ({
    page,
  }) => {
    await page.goto("/tabs");
    const info = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-tabs[data-testid='tabs-auto']",
      )!;
      const list = host.shadowRoot!.querySelector<HTMLElement>(
        "[part='tablist']",
      )!;
      return {
        role: list.getAttribute("role"),
        ariaLabel: list.getAttribute("aria-label"),
      };
    });
    expect(info.role).toBe("tablist");
    expect(info.ariaLabel).toBe("Documentation");
  });

  test("first tab is selected by default; other panels are hidden", async ({ page }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    const first = page.locator("lucid-tab[data-testid='tab-overview']");
    await expect(first).toHaveAttribute("selected", "");

    const otherPanel = page.locator("lucid-tab-panel[data-testid='panel-usage']");
    await expect(otherPanel).toHaveAttribute("hidden", "");
  });

  test("clicking a tab selects it, shows its panel, hides others, fires event", async ({
    page,
  }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    // Listen for the change event.
    await page.evaluate(() => {
      (window as any).__events = [];
      document
        .querySelector("lucid-tabs[data-testid='tabs-auto']")!
        .addEventListener("lucid-value-change", (e) =>
          (window as any).__events.push((e as CustomEvent).detail),
        );
    });

    await page.locator("lucid-tab[data-testid='tab-usage']").click();
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await expect(
      page.locator("lucid-tab[data-testid='tab-usage']"),
    ).toHaveAttribute("selected", "");
    await expect(
      page.locator("lucid-tab-panel[data-testid='panel-overview']"),
    ).toHaveAttribute("hidden", "");
    await expect(
      page.locator("lucid-tab-panel[data-testid='panel-usage']"),
    ).not.toHaveAttribute("hidden", /.+/);

    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toEqual([{ value: "usage" }]);
  });

  test("keyboard: only the selected tab is in the tab order (roving tabindex)", async ({
    page,
  }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    const tabIndexes = await page.evaluate(() => {
      const tabs = Array.from(
        document
          .querySelector("lucid-tabs[data-testid='tabs-auto']")!
          .querySelectorAll<HTMLElement>(":scope > lucid-tab"),
      );
      return tabs.map((t) => ({
        testid: t.dataset.testid,
        tabindex: t.tabIndex,
      }));
    });
    const zeroCount = tabIndexes.filter((t) => t.tabindex === 0).length;
    expect(zeroCount).toBe(1);
    expect(tabIndexes.find((t) => t.testid === "tab-overview")?.tabindex).toBe(0);
  });

  test("keyboard: arrow-right moves selection (automatic activation)", async ({
    page,
  }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await page.evaluate(() => {
      const tab = document.querySelector<HTMLElement>(
        "lucid-tab[data-testid='tab-overview']",
      )!;
      tab.focus();
    });
    await page.keyboard.press("ArrowRight");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await expect(
      page.locator("lucid-tab[data-testid='tab-usage']"),
    ).toHaveAttribute("selected", "");
  });

  test("keyboard: Home/End jump to first/last", async ({ page }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await page.evaluate(() => {
      const tab = document.querySelector<HTMLElement>(
        "lucid-tab[data-testid='tab-overview']",
      )!;
      tab.focus();
    });
    await page.keyboard.press("End");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));
    await expect(
      page.locator("lucid-tab[data-testid='tab-api']"),
    ).toHaveAttribute("selected", "");

    await page.keyboard.press("Home");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));
    await expect(
      page.locator("lucid-tab[data-testid='tab-overview']"),
    ).toHaveAttribute("selected", "");
  });

  test("manual activation: arrow keys move focus but do NOT select", async ({
    page,
  }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await page.evaluate(() => {
      const tab = document.querySelector<HTMLElement>(
        "lucid-tab[data-testid='tab-two']",
      )!;
      tab.focus();
    });
    await page.keyboard.press("ArrowRight");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    // "two" should still be selected; only focus moved.
    await expect(
      page.locator("lucid-tab[data-testid='tab-two']"),
    ).toHaveAttribute("selected", "");
    await expect(
      page.locator("lucid-tab[data-testid='tab-three']"),
    ).not.toHaveAttribute("selected", /.+/);
  });

  test("disabled tab is skipped by arrow-key roving focus", async ({ page }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    await page.evaluate(() => {
      const tab = document.querySelector<HTMLElement>(
        "lucid-tab[data-testid='tab-a']",
      )!;
      tab.focus();
    });
    await page.keyboard.press("ArrowRight");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    // Should skip 'b' (disabled) and land on 'c'.
    await expect(
      page.locator("lucid-tab[data-testid='tab-c']"),
    ).toHaveAttribute("selected", "");
  });

  test("aria-controls / aria-labelledby link tabs to panels", async ({ page }) => {
    await page.goto("/tabs");
    await page.evaluate(() => new Promise((r) => queueMicrotask(() => r(null))));

    const linking = await page.evaluate(() => {
      const tab = document.querySelector<HTMLElement>(
        "lucid-tab[data-testid='tab-overview']",
      )!;
      const panelId = tab.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      return {
        panelId,
        panelLabelledBy: panel?.getAttribute("aria-labelledby"),
        tabId: tab.id,
      };
    });
    expect(linking.panelId).not.toBe(null);
    expect(linking.panelLabelledBy).toBe(linking.tabId);
  });
});

function format(v: unknown[]): string {
  if (!Array.isArray(v) || v.length === 0) { return "no violations"; }
  return v
    .map(
      (x: any) =>
        `\n  [${x.id}] ${x.help} (${x.impact})\n    ${x.helpUrl}\n    nodes: ${x.nodes
          .map((n: any) => n.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");
}
