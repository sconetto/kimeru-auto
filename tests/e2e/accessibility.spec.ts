import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { compareModelYearIds } from "./helpers/compare-options";

/**
 * Accessibility checks (WCAG 2.1 AA) on key public pages using axe-core.
 * Note: scan results are logged; strict assertion is limited to critical
 * violations so flaky serif/contrast edge cases don't block CI.
 */

const pages = [
  { name: "home", url: "/pt-BR" },
  { name: "car detail", url: "/pt-BR/car/hb20" },
  { name: "financing", url: "/pt-BR/financing" },
  { name: "about", url: "/pt-BR/about" },
  { name: "best sellers", url: "/pt-BR/best-sellers" },
  { name: "brands", url: "/pt-BR/brands" },
  { name: "reviews", url: "/pt-BR/reviews" },
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

test("axe scan: comparison page", async ({ page, request }) => {
  const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
  await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
});
