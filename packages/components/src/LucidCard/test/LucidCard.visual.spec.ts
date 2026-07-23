import { test, expect } from "@playwright/test";

const DIRS = ["ltr", "rtl"] as const;

for (const dir of DIRS) {
  test.describe(`lucid-card — visual (${dir})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/card");
      await page.evaluate((d) => {
        document.documentElement.setAttribute("dir", d);
      }, dir);
      await page.waitForSelector("lucid-card[data-testid='card-default']");
    });

    test(`full page snapshot — ${dir}`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`LucidCard-page-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`elevated card — ${dir}`, async ({ page }) => {
      const el = page.locator("lucid-card[data-testid='card-elevated']");
      await expect(el).toHaveScreenshot(`LucidCard-elevated-${dir}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });

    test(`clickable card — focused state (${dir})`, async ({ page }) => {
      // Focus the internal control programmatically, then press a
      // benign key so Chromium marks the focus as keyboard-originated
      // and :focus-visible resolves to true.
      await page.evaluate(() => {
        const inner = document
          .querySelector("lucid-card[data-testid='card-clickable']")!
          .shadowRoot!.querySelector<HTMLElement>("[part='root']")!;
        inner.focus();
      });
      await page.keyboard.press("Shift");

      // Screenshot the parent grid instead of the host — the focus
      // outline lives outside the host's bounding box (outline-offset: 2px)
      // and element-level screenshots would clip it away.
      const container = page.locator("lucid-card[data-testid='card-clickable']").locator("..");
      await expect(container).toHaveScreenshot(
        `LucidCard-clickable-focused-${dir}.png`,
        {
          // The focus outline is only ~1800 pixels — tightening the tolerance
          // below the outline's contribution ensures a missing outline fails
          // the test. Loose ratios would let the regression through.
          maxDiffPixelRatio: 0.001,
          animations: "disabled",
        },
      );
    });
  });
}
