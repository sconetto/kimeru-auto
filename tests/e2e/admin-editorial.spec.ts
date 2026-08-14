import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

/**
 * Ensures a published HB20 editorial exists. Idempotent: opens the edit page
 * for the seeded HB20 model year and saves with "Publicar" checked, creating
 * the record if missing or republishing if a previous test unpublished it.
 */
async function ensureHb20Published(page: Page) {
  await page.goto("/admin/editorial");
  const row = page.locator("tr", { hasText: "HB20" }).first();
  if ((await row.count()) > 0 && (await row.getByText("Publicado").count()) > 0) return;

  const editLink = row.getByRole("link", { name: "Editar" });
  if ((await editLink.count()) > 0) {
    await editLink.click();
  } else {
    // No HB20 editorial yet — open HB20's versions listing from the cars
    // page (matching the row by name, not the first row) and take the first
    // model year id, which the editorial editor reuses.
    await page.goto("/admin/cars");
    const hb20Row = page.locator("tr", { hasText: "HB20" }).first();
    await hb20Row.locator('a[title="Versões e especificações"]').click();
    await page.waitForURL(/\/admin\/model-years\?modelId=\d+/);
    const yearEditLink = page.getByRole("link", { name: "Editar" }).first();
    const href = await yearEditLink.getAttribute("href");
    const modelYearId = href?.split("/").pop();
    if (!modelYearId) throw new Error("Could not resolve a model year id for HB20");
    await page.goto(`/admin/editorial/${modelYearId}`);
  }
  await expect(page.getByRole("heading", { name: /Editar conteúdo/ })).toBeVisible();
  const publish = page.getByLabel("Publicar (fica visível no site)");
  if (!(await publish.isChecked())) await publish.check();
  await page.getByRole("button", { name: "Salvar conteúdo" }).click();
  await expect(page).toHaveURL(/\/admin\/editorial$/);
}

test.describe("Admin editorial workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("browses editorial list with filters and status badges", async ({ page }) => {
    await ensureHb20Published(page);
    await page.goto("/admin/editorial");
    await expect(page.getByRole("heading", { name: "Conteúdo editorial" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todos os conteúdos" })).toBeVisible();

    const hb20Row = page.locator("tr", { hasText: "HB20" }).first();
    await expect(hb20Row).toBeVisible();
    await expect(hb20Row.getByText("Publicado")).toBeVisible();

    await page.getByRole("link", { name: "Rascunhos" }).click();
    await expect(page.locator("tr", { hasText: "HB20" })).toHaveCount(0);
  });

  test("edits an existing editorial and it reflects publicly", async ({ page }) => {
    await ensureHb20Published(page);
    await page.goto("/admin/editorial");
    const row = page.locator("tr", { hasText: "HB20" }).first();
    await row.getByRole("link", { name: "Editar" }).click();

    await expect(page.getByRole("heading", { name: /Editar conteúdo/ })).toBeVisible();
    const summary = page.getByLabel(/Resumo/);
    await summary.fill("## Desempenho\n**Texto editado pelo E2E.**");
    await page.getByRole("button", { name: "Salvar conteúdo" }).click();

    await expect(page).toHaveURL(/\/admin\/editorial$/);

    await page.goto("/pt-BR/car/hb20/review");
    await expect(page.getByRole("heading", { name: "Desempenho" })).toBeVisible();
    await expect(page.getByText("Texto editado pelo E2E.")).toBeVisible();
  });

  test("unpublishes an editorial and the public page 404s", async ({ page }) => {
    await ensureHb20Published(page);
    await page.goto("/admin/editorial");
    const row = page.locator("tr", { hasText: "HB20" }).first();
    page.on("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Despublicar" }).click();

    await expect(page.locator("tr", { hasText: "HB20" }).getByText("Rascunho")).toBeVisible();
    const resp = await page.goto("/pt-BR/car/hb20/review");
    expect(resp?.status()).toBe(404);
  });

  test("deletes an editorial with confirmation", async ({ page }) => {
    await ensureHb20Published(page);
    await page.goto("/admin/editorial");
    const row = page.locator("tr", { hasText: "HB20" }).first();
    page.on("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Excluir conteúdo" }).click();

    await expect(page.locator("tr", { hasText: "HB20" })).toHaveCount(0);
  });
});
