import { test, expect } from "@playwright/test";

const DIRS = ["ltr", "rtl"] as const;

for (const dir of DIRS) {
  test.describe(`lucid-tabs — visual (${dir})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/tabs");
      await page.evaluate((d) => {
        document.documentElement.setAttribute("dir", d);
      }, dir);
      await page.waitForSelector("lucid-tabs[data-testid='tabs-auto']");
      await page.evaluate(
        () => new Promise((r) => queueMicrotask(() => r(null))),
      );
    });

    test(`full page snapshot — ${dir}`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`LucidTabs-page-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`tablist — ${dir}`, async ({ page }) => {
      const el = page.locator("lucid-tabs[data-testid='tabs-auto']");
      await expect(el).toHaveScreenshot(`LucidTabs-auto-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  });
}
