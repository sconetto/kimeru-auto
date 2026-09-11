import { expect, test } from "@playwright/test";

test.describe("Brands without active models", () => {
  test("home page shows grayed-out coming-soon cards for empty brands", async ({ page }) => {
    await page.goto("/pt-BR");
    const grayed = page.locator('div[aria-disabled="true"]').first();
    await expect(grayed).toBeVisible();
    await expect(grayed.getByText("Modelos em breve")).toBeVisible();
    // Grayed cards are not links
    await expect(grayed.locator("a")).toHaveCount(0);
  });

  test("brand page shows coming-soon empty state", async ({ page }) => {
    const resp = await page.goto("/pt-BR/brands/audi");
    expect(resp?.status()).toBe(200);
    await expect(page.getByText("Modelos em breve")).toBeVisible();
  });
});
