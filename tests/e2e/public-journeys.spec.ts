import { expect, test } from "@playwright/test";

/**
 * Critical user journey: browse → compare → finance.
 * Requires the dev server (Playwright webServer config) and a seeded DB.
 */

test.describe("Public user journeys", () => {
  test("home page loads with brands and search", async ({ page }) => {
    await page.goto("/pt-BR");
    await expect(page.getByRole("heading", { name: /Compare carros e decida/i })).toBeVisible();
    // Brand grid should show seeded brands
    await expect(page.getByText("Fiat")).toBeVisible();
    await expect(page.getByText("Volkswagen")).toBeVisible();
  });

  test("car detail page shows specs and price", async ({ page }) => {
    await page.goto("/pt-BR/car/hb20");
    await expect(page.getByRole("heading", { name: /HB20/i }).first()).toBeVisible();
    // FIPE price section
    await expect(page.getByText(/Preço 0km/i)).toBeVisible();
    // Spec groups render
    await expect(page.getByText("Especificações técnicas")).toBeVisible();
  });

  test("car detail page shows slim editorial box with link to review", async ({ page }) => {
    await page.goto("/pt-BR/car/hb20");
    // Editorial summary box renders rating + read-review link
    await expect(page.getByText("Avaliação Kimeru")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ler review completa/i })).toBeVisible();
    // Full markdown body is NOT on the car page
    await expect(page.getByRole("heading", { name: "Desempenho" })).toHaveCount(0);
  });

  test("review page renders full editorial content", async ({ page }) => {
    await page.goto("/pt-BR/car/hb20/review");
    await expect(page.getByRole("heading", { name: /Review: Hyundai HB20/i })).toBeVisible();
    // Markdown sections render
    await expect(page.getByRole("heading", { name: "Desempenho" })).toBeVisible();
    // Score breakdown labels
    await expect(page.getByText("Custo-benefício", { exact: true })).toBeVisible();
    // Source video cards and transcripts
    await expect(page.getByText("Baseado em análises de:", { exact: true })).toBeVisible();
    await expect(page.getByText("Transcrições dos vídeos", { exact: true })).toBeVisible();
  });

  test("review index lists published reviews", async ({ page }) => {
    await page.goto("/pt-BR/reviews");
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    // HB20 has published editorial → appears in the index
    await expect(page.getByRole("link", { name: /HB20/i })).toBeVisible();
  });

  test("review page 404 for car without editorial", async ({ page }) => {
    const resp = await page.goto("/pt-BR/car/polo/review");
    // A car without published editorial returns HTTP 404
    expect(resp?.status()).toBe(404);
  });

  test("comparison page with two cars via URL", async ({ page }) => {
    await page.goto("/pt-BR/compare?cars=hb20,onix");
    await expect(page.getByRole("heading", { name: "Comparar Carros" })).toBeVisible();
    // Both cars in the table header
    await expect(page.getByText(/HB20/i).first()).toBeVisible();
    await expect(page.getByText(/Onix/i).first()).toBeVisible();
    // Spec rows render
    await expect(page.getByText("Potência")).toBeVisible();
  });

  test("financing calculator renders with CET", async ({ page }) => {
    await page.goto("/pt-BR/financing?price=100000");
    await expect(page.getByRole("heading", { name: /Simulador de Financiamento/i })).toBeVisible();
    await expect(page.getByText("Parcela mensal", { exact: true })).toBeVisible();
    await expect(page.getByText("CET anual", { exact: true }).first()).toBeVisible();
    // Amortization table renders
    await expect(page.getByText(/Sistema Price/i)).toBeVisible();
  });

  test("locale routing: EN-US page loads", async ({ page }) => {
    await page.goto("/en-US");
    // URL preserves the locale prefix
    await expect(page).toHaveURL(/\/en-US$/);
    // Language switcher shows EN as active
    await expect(page.getByRole("link", { name: "English" })).toBeVisible();
    // English UI strings render (translation has effect)
    await expect(page.getByText("Compare cars and decide with confidence")).toBeVisible();
  });

  test("locale routing: EN-US compare page shows English UI", async ({ page }) => {
    await page.goto("/en-US/compare?cars=hb20,onix");
    await expect(page.getByRole("heading", { name: "Compare Cars" })).toBeVisible();
    await expect(page.getByText("Share")).toBeVisible();
  });

  test("legacy PT-BR URL redirects to English path", async ({ page }) => {
    await page.goto("/pt-BR/comparar");
    await expect(page).toHaveURL(/\/pt-BR\/compare/);
  });

  test("about page renders story, creator and Ko-fi link", async ({ page }) => {
    await page.goto("/pt-BR/about");
    await expect(page.getByRole("heading", { name: /Sobre o Kimeru Auto/i })).toBeVisible();
    await expect(page.getByText(/campo minado/i)).toBeVisible();
    await expect(page.getByText("João Pedro Sconetto")).toBeVisible();
    await expect(page.getByRole("link", { name: /Me pague um café/i })).toBeVisible();
  });
});
