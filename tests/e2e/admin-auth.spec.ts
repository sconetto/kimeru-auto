import { expect, test } from "@playwright/test";

/**
 * Admin flow: login → protected routes.
 * Credentials come from .env.local (loaded by playwright.config.ts), falling
 * back to the seed default for manual seed runs without an env override.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

test.describe("Admin auth", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logs in and accesses dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill("wrong-password");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText(/Email ou senha inválidos/i)).toBeVisible();
  });
});
