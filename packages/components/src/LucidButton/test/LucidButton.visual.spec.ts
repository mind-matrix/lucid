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

    // Hover screenshots capture the parent row instead of the host —
    // the hover-shadow + `-1px` transform extend past the host's
    // bounding box, so host-level element screenshots would clip.
    for (const testid of ["btn-primary", "btn-ghost", "btn-default"] as const) {
      test(`${testid} — hover state (${dir})`, async ({ page }) => {
        await page.locator(`lucid-button[data-testid='${testid}']`).hover();
        const container = page
          .locator(`lucid-button[data-testid='${testid}']`)
          .locator("..");
        await expect(container).toHaveScreenshot(
          `LucidButton-${testid}-hover-${dir}.png`,
          {
            // Tight tolerance: hover shadow + 1px translate produce a
            // small but distinct pixel delta. Default 1% would let a
            // "no hover styling" regression through.
            maxDiffPixelRatio: 0.001,
            animations: "disabled",
          },
        );
      });
    }
  });
}
