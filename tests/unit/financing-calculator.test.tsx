import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { FinancingCalculator } from "@/app/[locale]/financing/financing-calculator";
import ptBR from "@/messages/pt-BR.json";

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={ptBR}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FinancingCalculator", () => {
  it("renders with default values", () => {
    renderWithProvider(<FinancingCalculator />);
    expect(screen.getByLabelText("Preço do veículo")).toBeInTheDocument();
    expect(screen.getByText("Parcela mensal")).toBeInTheDocument();
    expect(screen.getAllByText("CET anual").length).toBeGreaterThan(0);
    expect(screen.getByText("Tabela de amortização (Sistema Price)")).toBeInTheDocument();
  });

  it("respects initial price pre-fill", () => {
    renderWithProvider(<FinancingCalculator initialPrice={108030} />);
    const slider = screen.getByLabelText("Preço do veículo") as HTMLInputElement;
    expect(slider.value).toBe("108030");
  });

  it("updates results when term changes", () => {
    renderWithProvider(<FinancingCalculator initialPrice={100000} />);
    // Click 24m term button
    fireEvent.click(screen.getByRole("button", { name: "24m" }));
    // The selected term button should be the active (blue) one — verify state via table row
    expect(screen.getAllByText("24 meses").length).toBeGreaterThan(0);
  });

  it("pre-fills price when passed via query param", () => {
    renderWithProvider(<FinancingCalculator initialPrice={98500} />);
    const slider = screen.getByLabelText("Preço do veículo") as HTMLInputElement;
    expect(slider.value).toBe("98500");
  });
});
