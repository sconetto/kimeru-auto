import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

test.describe("Admin bulk import/export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("exports brands as CSV", async ({ page }) => {
    await page.goto("/admin/brands");
    // Assert the export endpoint returns CSV via the authenticated request
    // context (shares the browser session cookie). Avoids relying on the
    // download event, which is flaky under mobile emulation in CI.
    const res = await page.request.get("/api/admin/export/brands");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("name,slug,origin_country");
  });

  test("imports brands with preview and applies", async ({ page }) => {
    await page.goto("/admin/brands");

    const name = `E2E Import ${Date.now()}`;
    const csv = `name,origin_country,is_active\n${name},Brasil,1\n`;
    const filePayload = {
      name: "brands.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    };

    await page.locator('input[type="file"]').first().setInputFiles(filePayload);
    await expect(page.getByText("linha(s) detectadas")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar importação" }).click();

    // After apply the page reloads and the new brand appears in the list
    await expect(page.getByText(name)).toBeVisible();
  });
});
