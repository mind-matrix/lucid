import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("lucid-nav — accessibility", () => {
  test("axe: no violations", async ({ page }) => {
    await page.goto("/nav");
    await page.waitForSelector("lucid-nav[data-testid='nav-primary']");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect.soft(results.violations, format(results.violations)).toEqual([]);
  });

  test("host has role=navigation and inherits aria-label from label prop", async ({ page }) => {
    await page.goto("/nav");
    const host = page.locator("lucid-nav[data-testid='nav-primary']");
    await expect(host).toHaveAttribute("role", "navigation");
    await expect(host).toHaveAttribute("aria-label", "Primary");
  });

  test("active link exposes aria-current=page on internal <a>", async ({ page }) => {
    await page.goto("/nav");
    const inner = page
      .locator("lucid-nav-link[data-testid='nav-docs']")
      .locator("[part='control']");
    await expect(inner).toHaveAttribute("aria-current", "page");
    // Non-active link should NOT carry aria-current.
    const otherInner = page
      .locator("lucid-nav-link[data-testid='nav-home']")
      .locator("[part='control']");
    await expect(otherInner).not.toHaveAttribute("aria-current", /.+/);
  });

  test("external link with target=_blank gets safe rel", async ({ page }) => {
    await page.goto("/nav");
    const inner = page
      .locator("lucid-nav-link[data-testid='nav-github']")
      .locator("[part='control']");
    await expect(inner).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("disabled link removes href and is not tabbable", async ({ page }) => {
    await page.goto("/nav");
    const info = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>(
        "lucid-nav-link[data-testid='nav-disabled']",
      )!;
      const inner = host.shadowRoot!.querySelector<HTMLElement>("[part='control']")!;
      return {
        href: inner.getAttribute("href"),
        ariaDisabled: inner.getAttribute("aria-disabled"),
        tabindex: inner.getAttribute("tabindex"),
      };
    });
    expect(info.href).toBe(null);
    expect(info.ariaDisabled).toBe("true");
    expect(info.tabindex).toBe("-1");
  });

  test("keyboard: Tab visits each link in order (nav uses natural focus, no roving)", async ({
    page,
  }) => {
    await page.goto("/nav");
    await page.waitForSelector("lucid-nav-link[data-testid='nav-home']");

    // Programmatically focus the first link's internal <a>. Then step
    // forward with Tab and record which nav-link host we land on.
    // We can't rely on Playwright's page.keyboard driving focus from
    // a bare page load — the browser needs an initial focused element.
    await page.evaluate(() => {
      const first = document
        .querySelector("lucid-nav-link[data-testid='nav-home']")!
        .shadowRoot!.querySelector<HTMLElement>("[part='control']")!;
      first.focus();
    });

    const visited: string[] = [];
    for (let i = 0; i < 4; i++) {
      const testid = await page.evaluate(() => {
        // Walk into shadow roots to find the actually-focused element.
        let el: Element | null = document.activeElement;
        while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
        // If we ended inside a shadow root, hop up to the host.
        // `closest()` doesn't cross shadow boundaries, so use getRootNode.
        const root = el?.getRootNode();
        const host =
          root instanceof ShadowRoot ? (root.host as HTMLElement) : el;
        return (host as HTMLElement | null)?.dataset?.testid ?? null;
      });
      if (testid) visited.push(testid);
      await page.keyboard.press("Tab");
    }
    expect(visited).toEqual([
      "nav-home",
      "nav-docs",
      "nav-blog",
      "nav-github",
    ]);
  });
});

function format(v: unknown[]): string {
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
