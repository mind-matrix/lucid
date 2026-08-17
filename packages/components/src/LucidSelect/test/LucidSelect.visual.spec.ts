import { test, expect } from "@playwright/test";

const DIRS = ["ltr", "rtl"] as const;

for (const dir of DIRS) {
  test.describe(`lucid-select — visual (${dir})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/select");
      await page.evaluate((d) => {
        document.documentElement.setAttribute("dir", d);
      }, dir);
      await page.waitForSelector("lucid-select[data-testid='sel-empty']");
      await page.evaluate(
        () => new Promise((r) => queueMicrotask(() => r(null))),
      );
    });

    test(`full page snapshot — ${dir}`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`LucidSelect-page-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`closed trigger — ${dir}`, async ({ page }) => {
      const el = page.locator("lucid-select[data-testid='sel-preselected']");
      await expect(el).toHaveScreenshot(`LucidSelect-closed-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    // Open state is the whole point of the component, so it gets its own
    // baseline. Captured at page level rather than element level: the popup
    // renders in the top layer and overflows every ancestor's box, so an
    // element-scoped screenshot clips the listbox out entirely.
    test(`open listbox — ${dir}`, async ({ page }) => {
      await page.locator("lucid-select[data-testid='sel-empty']").click();
      await page.evaluate(
        () => new Promise((r) => queueMicrotask(() => r(null))),
      );
      await expect(page).toHaveScreenshot(`LucidSelect-open-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    // Visual proof that the popup leaves the top layer's containing block
    // rather than being cut off by the ancestor's `overflow: hidden`.
    test(`open inside a clipping ancestor — ${dir}`, async ({ page }) => {
      const clipper = page.locator("[data-testid='clipper']");
      await clipper.scrollIntoViewIfNeeded();
      await page.locator("lucid-select[data-testid='sel-clipped']").click();
      await page.evaluate(
        () => new Promise((r) => queueMicrotask(() => r(null))),
      );
      await expect(page).toHaveScreenshot(`LucidSelect-clipped-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  });
}
