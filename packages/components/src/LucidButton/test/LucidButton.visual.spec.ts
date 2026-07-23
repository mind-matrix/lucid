import { test, expect } from "@playwright/test";

const DIRS = ["ltr", "rtl"] as const;

for (const dir of DIRS) {
  test.describe(`lucid-button — visual (${dir})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/button");
      await page.evaluate((d) => {
        document.documentElement.setAttribute("dir", d);
      }, dir);
      await page.waitForSelector("lucid-button[data-testid='btn-primary']");
    });

    test(`full page snapshot — ${dir}`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`LucidButton-page-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`primary button — ${dir}`, async ({ page }) => {
      const btn = page.locator("lucid-button[data-testid='btn-primary']");
      await expect(btn).toHaveScreenshot(`LucidButton-primary-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  });
}
