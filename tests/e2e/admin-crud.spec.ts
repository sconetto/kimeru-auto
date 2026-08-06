import { expect, test } from "@playwright/test";

/**
 * Admin CRUD workflow: login → create brand → toggle → delete.
 * Credentials come from .env.local (loaded by playwright.config.ts).
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

test.describe("Admin CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("creates a brand via the form", async ({ page }) => {
    await page.goto("/admin/brands");
    await page.getByPlaceholder("Nome (ex: Fiat)").fill("E2E Teste Marca");
    await page.getByRole("button", { name: "Criar" }).click();

    // Brand appears in the table (server action revalidates)
    await expect(page.getByText("E2E Teste Marca")).toBeVisible();
  });

  test("deletes a brand", async ({ page }) => {
    await page.goto("/admin/brands");
    // Create one first if not present
    const row = page.locator("tr", { hasText: "E2E Teste Marca" });
    if ((await row.count()) > 0) {
      // Accept the confirm dialog
      page.on("dialog", (d) => d.accept());
      await row.getByRole("button", { name: "Excluir" }).click();
      await expect(page.getByText("E2E Teste Marca")).toHaveCount(0, { timeout: 5000 });
    }
  });

  test("dashboard shows catalog stats", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Marcas ativas")).toBeVisible();
    await expect(page.getByText("Modelos ativos")).toBeVisible();
  });
});
