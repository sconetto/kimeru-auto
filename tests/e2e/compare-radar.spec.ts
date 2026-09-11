import { expect, test } from "@playwright/test";
import { compareModelYearIds } from "./helpers/compare-options";

test.describe("Compare radar overview", () => {
  test("radar section renders with winner badge when comparing 2+ cars", async ({
    page,
    request,
  }) => {
    const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);
    await expect(page.getByRole("heading", { name: /Visão geral/ })).toBeVisible();
    await expect(page.getByText(/(Melhor no geral:|Empate técnico:|Empate geral)/)).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Gráfico radar de comparação de veículos" }),
    ).toBeVisible();
    // Legend shows both cars (scoped to the legend; car names also appear in
    // cards/table headings, and the desktop table is hidden on mobile)
    const legend = page.getByTestId("radar-legend");
    await expect(legend.getByText(/HB20/)).toBeVisible();
    await expect(legend.getByText(/Onix/)).toBeVisible();
  });

  test("shows which car leads each category", async ({ page, request }) => {
    const [strada, hb20, onix] = await compareModelYearIds(request, ["strada", "hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${strada},${hb20},${onix}`);
    await expect(page.getByText("Quem lidera cada categoria")).toBeVisible();
    // Cars that lead at least one category appear with "lidera em:"
    await expect(page.getByText(/lidera em:/).first()).toBeVisible();
  });

  test("radar hidden with a single car", async ({ page, request }) => {
    const [hb20] = await compareModelYearIds(request, ["hb20"]);
    await page.goto(`/pt-BR/compare?cars=${hb20}`);
    await expect(page.getByRole("heading", { name: /Visão geral/ })).toHaveCount(0);
  });

  test("spec comparison uses cards on mobile and table on desktop", async ({
    page,
    request,
    isMobile,
  }) => {
    const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
    await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);
    const table = page.getByTestId("spec-table");
    const cards = page.getByTestId("spec-cards");
    if (isMobile) {
      await expect(cards).toBeVisible();
      await expect(table).toBeHidden();
      // A spec card renders every car's value as a labeled row
      await expect(cards.getByText(/HB20/).first()).toBeVisible();
      await expect(cards.getByText(/Onix/).first()).toBeVisible();
    } else {
      await expect(table).toBeVisible();
      await expect(cards).toBeHidden();
      await expect(table.getByText("Potência", { exact: true })).toBeVisible();
    }
  });
});
