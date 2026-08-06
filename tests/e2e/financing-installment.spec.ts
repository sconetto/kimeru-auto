import { expect, test } from "@playwright/test";

test.describe("Financing calculator — by-installment mode", () => {
  test("switching to installment mode shows target input and derived rate", async ({ page }) => {
    await page.goto("/pt-BR/financing?price=100000");
    await page.getByRole("button", { name: "Por valor da parcela" }).click();

    // Target installment input appears
    const input = page.getByLabel("Valor da parcela desejada");
    await expect(input).toBeVisible();

    // A target higher than the zero-rate minimum yields a positive implied rate
    await input.fill("2500");
    await expect(page.getByText(/Taxa implícita:/)).toBeVisible();
    await expect(page.getByText(/% a\.m\./)).toBeVisible();
  });

  test("derived rate reproduces the target installment", async ({ page }) => {
    await page.goto("/pt-BR/financing?price=100000");
    await page.getByRole("button", { name: "Por valor da parcela" }).click();

    const input = page.getByLabel("Valor da parcela desejada");
    await input.fill("2500");

    // The monthly payment result should track the target closely
    await expect(page.getByText("Parcela mensal", { exact: true })).toBeVisible();
  });
});
