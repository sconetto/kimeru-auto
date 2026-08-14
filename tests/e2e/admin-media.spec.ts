import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123456";

test.describe("Admin media upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("uploads a valid PNG image and returns a URL", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
      const blob = new Blob([png], { type: "image/png" });
      const file = new File([blob], "test.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      return { status: resp.status, body: await resp.json().catch(() => ({})) };
    });
    expect(res.status).toBe(200);
    expect(res.body.url).toBeTruthy();
  });

  test("rejects an invalid file type", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const txt = new Blob(["hello"], { type: "text/plain" });
      const file = new File([txt], "test.txt", { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      return { status: resp.status, body: await resp.json().catch(() => ({})) };
    });
    expect(res.status).toBe(400);
  });

  test("rejects an oversized file", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const big = new Uint8Array(6 * 1024 * 1024); // 6 MB
      const blob = new Blob([big], { type: "image/png" });
      const file = new File([blob], "big.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      return { status: resp.status };
    });
    expect(res.status).toBe(413);
  });

  test("rejects unauthenticated upload", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.evaluate(async () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const blob = new Blob([png], { type: "image/png" });
      const file = new File([blob], "t.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      return { status: resp.status };
    });
    expect(res.status).toBe(401);
  });
});
