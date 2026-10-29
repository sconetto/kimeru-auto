import { expect, test } from "@playwright/test";
import { compareModelYearIds } from "./helpers/compare-options";

// Next.js injects its own role="alert" route announcer, so snackbars are
// targeted by test id rather than by role.
const snackbar = (page: import("@playwright/test").Page) => page.getByTestId("snackbar");

test.describe("Snackbar feedback", () => {
  test("sharing a comparison shows a success snackbar", async ({ page, context, request }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect(snackbar(page)).toBeVisible();
    await expect(snackbar(page)).toHaveAttribute("role", "status");
    await expect(snackbar(page)).toContainText("Copiado");
  });

  test("adding a fourth car shows an error snackbar above the modal", async ({ page, request }) => {
    const [strada, hb20, onix] = await compareModelYearIds(request, ["strada", "hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${strada},${hb20},${onix}`);

    await page.getByRole("button", { name: "Adicionar veículo" }).first().click();
    await page.getByLabel("Marca").selectOption({ index: 1 });
    await page.getByLabel("Modelo").selectOption({ index: 1 });
    await page.getByLabel("Versão").selectOption({ index: 1 });
    await page.getByLabel("Ano").selectOption({ index: 1 });
    await page.getByRole("dialog").getByRole("button", { name: "Adicionar veículo" }).click();

    await expect(snackbar(page)).toBeVisible();
    await expect(snackbar(page)).toHaveAttribute("role", "alert");
    await expect(snackbar(page)).toContainText("Máximo de 3 veículos para comparação");
    // The previous inline red paragraph is gone.
    await expect(page.locator("p.text-red-600")).toHaveCount(0);
  });

  test("a failing FIPE years request shows an error snackbar", async ({ page }) => {
    await page.route("**/api/fipe/brands/*/models/*/years", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "upstream unavailable", code: "NETWORK" }),
      }),
    );

    await page.goto("/pt-BR/fipe");
    await page.getByLabel("Marca").selectOption({ index: 1 });

    const model = page.getByLabel("Modelo");
    await expect(model.locator("option").nth(1)).toBeAttached({ timeout: 15_000 });
    await model.selectOption({ index: 1 });

    await expect(snackbar(page)).toBeVisible();
    await expect(snackbar(page)).toHaveAttribute("role", "alert");
    await expect(snackbar(page)).toContainText("Não foi possível carregar os anos");
    await expect(page.locator("p.text-red-600")).toHaveCount(0);
  });
});
