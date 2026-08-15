import { expect, type Page, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

async function createUser(page: Page, role = "editor") {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@kimeru.example`;
  await page.goto("/admin/users");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Nome").fill("E2E User");
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByLabel("Papel").selectOption(role);
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await expect(page.getByText(email)).toBeVisible();
  return email;
}

test.describe("Admin user management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("creates an editor user", async ({ page }) => {
    const email = await createUser(page);
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("Editor").first()).toBeVisible();
  });

  test("edits a user role", async ({ page }) => {
    const email = await createUser(page);
    const row = page.locator("tr", { hasText: email }).first();
    await row.getByRole("link", { name: "Editar usuário" }).click();
    // Wait for the edit page to settle before touching the select — otherwise
    // getByLabel can resolve the create form's role select on the list page
    // during the navigation transition and the change is lost.
    await expect(page.getByRole("heading", { name: "Editar usuário" })).toBeVisible();
    await page.getByLabel("Papel").selectOption("viewer");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    const editedRow = page.locator("tr", { hasText: email }).first();
    await expect(editedRow.getByText("Visualizador")).toBeVisible();
  });

  test("deletes a user", async ({ page }) => {
    const email = await createUser(page);
    const row = page.locator("tr", { hasText: email }).first();
    page.on("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Excluir usuário" }).click();
    await expect(page.getByText(email)).toHaveCount(0, { timeout: 5000 });
  });
});
