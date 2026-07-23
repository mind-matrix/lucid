import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("lucid-card — accessibility", () => {
  test("axe: no violations across variants", async ({ page }) => {
    await page.goto("/card");
    await page.waitForSelector("lucid-card[data-testid='card-default']");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect.soft(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test("renders slotted title, icon, and body content in light DOM", async ({ page }) => {
    await page.goto("/card");
    const card = page.locator("lucid-card[data-testid='card-default']");
    await expect(card.locator("[slot='title']")).toHaveText("Default card");
    await expect(card.locator("[slot='icon']")).toBeVisible();
    await expect(card.locator("p")).toContainText("Outlined by default");
  });

  test("icon slot is optional — cards without an icon still render", async ({ page }) => {
    await page.goto("/card");
    const card = page.locator("lucid-card[data-testid='card-no-icon']");
    await expect(card.locator("[slot='icon']")).toHaveCount(0);
    await expect(card.locator("[slot='title']")).toBeVisible();
  });

  test("variants surface as host attribute (for external targeting)", async ({ page }) => {
    await page.goto("/card");
    await expect(page.locator("lucid-card[data-testid='card-filled']")).toHaveAttribute(
      "variant",
      "filled",
    );
    await expect(page.locator("lucid-card[data-testid='card-elevated']")).toHaveAttribute(
      "variant",
      "elevated",
    );
  });

  test("exposes shadow-DOM structure via ::part", async ({ page }) => {
    await page.goto("/card");
    const part = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-card[data-testid='card-default']",
      )!;
      return host.shadowRoot!.querySelector("[part='root']")?.tagName;
    });
    expect(part).toBe("ARTICLE");
  });

  test("non-clickable card has no role, no tabindex", async ({ page }) => {
    await page.goto("/card");
    const attrs = await page.evaluate(() => {
      const inner = document
        .querySelector("lucid-card[data-testid='card-default']")!
        .shadowRoot!.querySelector("[part='root']")!;
      return {
        role: inner.getAttribute("role"),
        tabindex: inner.getAttribute("tabindex"),
      };
    });
    expect(attrs.role).toBe(null);
    expect(attrs.tabindex).toBe(null);
  });

  test("clickable card is role=button with tabindex=0", async ({ page }) => {
    await page.goto("/card");
    const inner = page
      .locator("lucid-card[data-testid='card-clickable']")
      .locator("[part='root']");
    await expect(inner).toHaveAttribute("role", "button");
    await expect(inner).toHaveAttribute("tabindex", "0");
  });

  test("clickable card activates on Enter and Space", async ({ page }) => {
    await page.goto("/card");
    await page.waitForSelector("lucid-card[data-testid='card-clickable']");

    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-card[data-testid='card-clickable']",
      )!;
      (window as any).__cardClicks = 0;
      host.addEventListener("click", () => {
        (window as any).__cardClicks += 1;
      });
      host.shadowRoot!.querySelector<HTMLElement>("[part='root']")!.focus();
    });

    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");

    const count = await page.evaluate(() => (window as any).__cardClicks);
    expect(count).toBe(2);
  });

  test("disabled clickable card is focusable but suppresses activation", async ({ page }) => {
    await page.goto("/card");
    const inner = page
      .locator("lucid-card[data-testid='card-clickable-disabled']")
      .locator("[part='root']");
    await expect(inner).toHaveAttribute("aria-disabled", "true");
    await expect(inner).toHaveAttribute("tabindex", "-1");

    const clickFired = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-card[data-testid='card-clickable-disabled']",
      )!;
      let fired = false;
      host.addEventListener("click", () => (fired = true));
      host.click();
      return fired;
    });
    expect(clickFired).toBe(false);
  });

  test("keyboard: Tab reaches clickable cards, non-clickable are skipped", async ({ page }) => {
    await page.goto("/card");
    await page.waitForSelector("lucid-card[data-testid='card-clickable']");

    const tabbable = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("lucid-card"));
      return cards.map((c) => {
        const testid = (c as HTMLElement).dataset.testid ?? "";
        const inner = c.shadowRoot!.querySelector("[part='root']")!;
        const t = inner.getAttribute("tabindex");
        return { testid, tabindex: t };
      });
    });

    const clickable = tabbable.filter((t) => t.testid === "card-clickable");
    const nonClickable = tabbable.filter((t) => t.testid === "card-default");
    expect(clickable[0]?.tabindex).toBe("0");
    expect(nonClickable[0]?.tabindex).toBe(null);
  });
});

function formatViolations(v: unknown[]): string {
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
