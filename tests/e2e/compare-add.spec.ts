import { expect, test } from "@playwright/test";

test.describe("Compare add flow (regression: car didn't load after selection)", () => {
  test("selecting a vehicle via dropdown loads it into the comparison", async ({ page }) => {
    await page.goto("/pt-BR/compare");
    await expect(
      page.getByText("Adicione o primeiro veículo usando o seletor acima."),
    ).toBeVisible();

    // Select the first available vehicle (value = slug)
    const select = page.getByLabel("Selecionar veículo");
    const options = await select.locator("option").allTextContents();
    const first = options.find((o) => o.trim() !== "");
    expect(first).toBeTruthy();
    await select.selectOption({ index: 1 });

    // After URL navigation + server re-render, the selected car should appear
    await expect(page.getByText("Simular financiamento").first()).toBeVisible({ timeout: 10_000 });
    // The "+" empty-state placeholder should be gone
    await expect(page.getByText("Adicione o primeiro veículo usando o seletor acima.")).toHaveCount(
      0,
    );
  });
});
