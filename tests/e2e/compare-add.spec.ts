import { expect, test } from "@playwright/test";

test.describe("Compare add flow (regression: car didn't load after selection)", () => {
  test("selecting a vehicle via the cascade selector loads it into the comparison", async ({
    page,
  }) => {
    await page.goto("/pt-BR/compare");
    // Empty state shows the add trigger and no counter yet
    await expect(page.getByRole("heading", { name: "Comparar Carros" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar veículo" }).first()).toBeVisible();

    // Open the add-vehicle modal (empty-state trigger)
    await page.getByRole("button", { name: "Adicionar veículo" }).first().click();

    // Cascade: Marca → Modelo → Versão → Ano (first real option each)
    const brand = page.getByLabel("Marca");
    await expect(brand).toBeVisible();
    await brand.selectOption({ index: 1 });

    const model = page.getByLabel("Modelo");
    await expect(model).toBeVisible();
    await model.selectOption({ index: 1 });

    const version = page.getByLabel("Versão");
    await expect(version).toBeVisible();
    await version.selectOption({ index: 1 });

    const year = page.getByLabel("Ano");
    await expect(year).toBeVisible();
    await year.selectOption({ index: 1 });

    // Confirm selection (submit button inside the dialog)
    await page.getByRole("dialog").getByRole("button", { name: "Adicionar veículo" }).click();

    // After URL navigation + server re-render, the selected car should appear
    await expect(page.getByText("Simular financiamento").first()).toBeVisible({ timeout: 10_000 });
    // The counter confirms exactly one vehicle is loaded
    await expect(page.getByText("1 de 3 veículos", { exact: true })).toBeVisible();
  });
});
