import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Mobile navigation drawer", () => {
  // The hamburger is `xl:hidden`, so this suite only applies to mobile viewports.
  test.skip(({ isMobile }) => !isMobile, "drawer is a mobile-only element");

  test("hamburger visible below xl, hidden on desktop", async ({ page }) => {
    await page.goto("/pt-BR");
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    // Desktop nav links are hidden below xl
    await expect(page.getByRole("navigation").filter({ hasText: "Comparar" })).toHaveCount(0);
  });

  test("opens drawer with all nav links + language switcher", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    for (const label of [
      "Início",
      "Comparar",
      "Reviews",
      "Tabela FIPE",
      "Financiamento",
      "Mais Vendidos",
      "Sobre",
      "Marcas",
    ]) {
      await expect(dialog.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    // Language switcher is inside the drawer
    await expect(dialog.getByRole("link", { name: "English" })).toBeVisible();
  });

  test("closes on overlay click", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    // The overlay is a full-screen backdrop behind the right-side drawer; click
    // a point to the left of the drawer so the click lands on the overlay.
    await page.mouse.click(40, 300);
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });

  test("closes on Escape", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });

  test("navigating via a drawer link closes the drawer and lands on the target page", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Financiamento" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/financing/);
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  });

  test("focus moves into the drawer on open", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeFocused();
  });

  test("axe scan: no critical violations with the drawer open", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
});