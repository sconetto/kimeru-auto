import { expect, test } from "@playwright/test";

test.describe("Sales reporting", () => {
  test("best-sellers shows the month selector and year-to-date totals", async ({ page }) => {
    await page.goto("/pt-BR/best-sellers");

    await expect(page.getByRole("heading", { name: "Mais Vendidos" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mês de referência" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /até agora/ })).toBeVisible();
    await expect(page.getByRole("table", { name: "Modelos mais vendidos no ano" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Marcas mais vendidas no ano" })).toBeVisible();
  });

  test("selecting an older month moves the active period", async ({ page }) => {
    await page.goto("/pt-BR/best-sellers");

    const chips = page.getByRole("navigation", { name: "Mês de referência" }).getByRole("link");
    const count = await chips.count();
    test.skip(count < 2, "needs at least two imported months");

    const oldest = chips.nth(count - 1);
    const href = await oldest.getAttribute("href");
    await oldest.click();

    await expect(page).toHaveURL(new RegExp(String(href).replace("?", "\\?")));
    await expect(
      page
        .getByRole("navigation", { name: "Mês de referência" })
        .getByRole("link")
        .nth(count - 1),
    ).toHaveAttribute("aria-current", "page");
  });

  test("a brand listing shows each model exactly once", async ({ page, request }) => {
    const response = await request.get("/api/catalog/compare-options");
    expect(response.ok()).toBe(true);
    const { brands } = (await response.json()) as { brands: { slug: string }[] };
    test.skip(brands.length === 0, "needs seeded catalog data");

    await page.goto(`/pt-BR/brands/${brands[0].slug}`);

    const hrefs = await page
      .locator('a[href^="/pt-BR/car/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
