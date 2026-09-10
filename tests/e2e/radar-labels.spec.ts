import { expect, test } from "@playwright/test";
import { compareModelYearIds } from "./helpers/compare-options";

test("radar renders all dimension labels without clipping", async ({ page, request }) => {
  const [hb20, onix] = await compareModelYearIds(request, ["hb20", "onix"]);
  await page.goto(`/pt-BR/compare?cars=${hb20},${onix}`);
  const svg = page.getByRole("img", { name: "Gráfico radar de comparação de veículos" });
  await expect(svg).toBeVisible();
  // All 6 dimension labels rendered as single-line <text> nodes (no mid-word tspan breaks)
  for (const label of ["Desempenho", "Consumo", "Espaço", "Segurança", "Tecnologia", "Custo"]) {
    await expect(svg).toContainText(label);
  }
});
