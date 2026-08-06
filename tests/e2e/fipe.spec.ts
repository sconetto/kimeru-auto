import { expect, test } from "@playwright/test";

test.describe("FIPE lookup", () => {
  test("page loads with brand selector", async ({ page }) => {
    await page.goto("/pt-BR/fipe");
    await expect(page.getByRole("heading", { name: "Tabela FIPE" })).toBeVisible();
    await expect(page.getByLabel("Marca")).toBeVisible();
    await expect(page.getByRole("button", { name: "Consultar preço" })).toBeVisible();
  });
});
