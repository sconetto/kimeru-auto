import { expect, test } from "@playwright/test";
import { compareModelYearIds } from "./helpers/compare-options";

// Next.js injects its own role="alert" route announcer, so snackbars are
// targeted by test id rather than by role.
const snackbar = (page: import("@playwright/test").Page) => page.getByTestId("snackbar");

test.describe("Snackbar feedback", () => {
  test("sharing a comparison shows a success snackbar", async ({
    page,
    context,
    request,
    browserName,
  }) => {
    // WebKit rejects the clipboard permission names; it allows writes on a user gesture.
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }
    const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect(snackbar(page)).toBeVisible();
    await expect(snackbar(page)).toHaveAttribute("role", "status");
    await expect(snackbar(page)).toContainText("Copiado");
  });

  test("a failed admin login shows an error snackbar", async ({ page }) => {
    await page.goto("/admin/login");
    // A throwaway account keeps this failure out of the real admin's
    // 5-attempt login throttle bucket.
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.com`);
    await page.getByLabel("Senha").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(snackbar(page)).toBeVisible();
    await expect(snackbar(page)).toHaveAttribute("role", "alert");
    await expect(snackbar(page)).toContainText("Email ou senha inválidos");
    // The admin tree mounts the provider with a static PT label.
    await expect(snackbar(page).getByRole("button")).toHaveAttribute("aria-label", "Fechar");
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
    // The previous inline red paragraph is gone.
    await expect(page.locator("p.text-red-600")).toHaveCount(0);
  });
});
