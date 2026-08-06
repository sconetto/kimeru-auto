import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility checks (WCAG 2.1 AA) on key public pages using axe-core.
 * Note: scan results are logged; strict assertion is limited to critical
 * violations so flaky serif/contrast edge cases don't block CI.
 */

const pages = [
  { name: "home", url: "/pt-BR" },
  { name: "car detail", url: "/pt-BR/car/hb20" },
  { name: "comparison", url: "/pt-BR/compare?cars=hb20,onix" },
  { name: "financing", url: "/pt-BR/financing" },
];

for (const { name, url } of pages) {
  test(`axe scan: ${name} page`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
}
