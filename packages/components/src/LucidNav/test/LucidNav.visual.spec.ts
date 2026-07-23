import { test, expect } from "@playwright/test";

const DIRS = ["ltr", "rtl"] as const;

for (const dir of DIRS) {
  test.describe(`lucid-nav — visual (${dir})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/nav");
      await page.evaluate((d) => {
        document.documentElement.setAttribute("dir", d);
      }, dir);
      await page.waitForSelector("lucid-nav[data-testid='nav-primary']");
    });

    test(`full page snapshot — ${dir}`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`LucidNav-page-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`horizontal nav — ${dir}`, async ({ page }) => {
      const el = page.locator("lucid-nav[data-testid='nav-primary']");
      await expect(el).toHaveScreenshot(`LucidNav-primary-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`vertical nav — ${dir}`, async ({ page }) => {
      const el = page.locator("lucid-nav[data-testid='nav-sidebar']");
      await expect(el).toHaveScreenshot(`LucidNav-sidebar-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  });
}
