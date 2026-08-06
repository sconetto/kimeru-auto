import { expect, test } from "@playwright/test";

test.describe("Compare radar overview", () => {
  test("radar section renders with winner badge when comparing 2+ cars", async ({ page }) => {
    await page.goto("/pt-BR/compare?cars=hb20,onix");
    await expect(page.getByRole("heading", { name: /Visão geral/ })).toBeVisible();
    await expect(page.getByText(/(Melhor no geral:|Empate técnico:|Empate geral)/)).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Gráfico radar de comparação de veículos" }),
    ).toBeVisible();
    // Legend shows both cars (first() avoids strict-mode clash when car name
    // appears in both the card heading and the radar legend)
    await expect(page.getByText("HB20", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Onix", { exact: true }).first()).toBeVisible();
  });

  test("shows which car leads each category", async ({ page }) => {
    await page.goto("/pt-BR/compare?cars=strada,hb20,onix");
    await expect(page.getByText("Quem lidera cada categoria")).toBeVisible();
    // Cars that lead at least one category appear with "lidera em:"
    await expect(page.getByText(/lidera em:/).first()).toBeVisible();
  });

  test("radar hidden with a single car", async ({ page }) => {
    await page.goto("/pt-BR/compare?cars=hb20");
    await expect(page.getByRole("heading", { name: /Visão geral/ })).toHaveCount(0);
  });
});
