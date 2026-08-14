import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

/** Locate a type row by its stable data-name attribute. */
function typeRow(page: import("@playwright/test").Page, name: string) {
  return page.locator(`[data-name="${name}"]`).first();
}

async function createCategory(page: import("@playwright/test").Page, name: string) {
  await page.goto("/admin/types");
  await page.getByPlaceholder("Nova categoria (ex: Minivan)").fill(name);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(typeRow(page, name)).toBeVisible();
}

test.describe("Admin types management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("creates a vehicle category and it appears in the model form", async ({ page }) => {
    const name = `E2E Categoria ${Date.now()}`;
    await createCategory(page, name);

    // New category (active by default) appears as an option in the model form
    await page.goto("/admin/cars");
    const select = page.locator('select[name="category"]');
    await expect(select.locator("option", { hasText: name })).toHaveCount(1);
  });

  test("creates a spec group", async ({ page }) => {
    await page.goto("/admin/types");
    const name = `E2E Grupo ${Date.now()}`;
    await page.getByPlaceholder("Novo grupo (ex: Carroceria)").fill(name);
    await page.getByRole("button", { name: "Adicionar" }).last().click();

    await expect(typeRow(page, name)).toBeVisible();
  });

  test("renames a vehicle category", async ({ page }) => {
    const name = `E2E Renomear ${Date.now()}`;
    await createCategory(page, name);

    const row = typeRow(page, name);
    await row.getByRole("button", { name: "Renomear" }).click();
    await row.getByRole("textbox").fill(`${name} 2`);
    await row.getByRole("button", { name: "Salvar" }).click();

    await expect(typeRow(page, `${name} 2`)).toBeVisible();
  });

  test("reorders vehicle categories via move buttons", async ({ page }) => {
    // Create two fresh categories; the second lands after the first, so
    // moving it up must place it before its sibling.
    const base = `E2E Ordem ${Date.now()}`;
    const first = `${base} A`;
    const second = `${base} B`;
    await createCategory(page, first);
    await createCategory(page, second);

    const firstY = (await typeRow(page, first).boundingBox())?.y ?? 0;
    const secondRow = typeRow(page, second);
    await secondRow.getByRole("button", { name: "Mover para cima" }).click();

    // After revalidation the second row should now sit above the first.
    await expect
      .poll(async () => (await typeRow(page, second).boundingBox())?.y)
      .toBeLessThan(firstY);
  });
});
