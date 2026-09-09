import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { SpecTable } from "@/components/compare/spec-table";
import type { SpecGrouped } from "@/lib/catalog/queries";

const messages = { common: { unavailable: "Não informado" } };

const sampleSpecs: SpecGrouped[] = [
  {
    group: "engine",
    label: "engine",
    specs: [
      {
        categoryId: 1,
        name: "Potência",
        slug: "power",
        unit: "cv",
        value: "120",
        numericValue: "120",
        displayValue: "120 cv",
        higherIsBetter: true,
        isNumeric: true,
      },
      {
        categoryId: 2,
        name: "0-100",
        slug: "acceleration-0-100",
        unit: "s",
        value: "9.9",
        numericValue: "9.9",
        displayValue: "9.9 s",
        higherIsBetter: false,
        isNumeric: true,
      },
      {
        categoryId: 3,
        name: "Combustível",
        slug: "fuel-type",
        unit: null,
        value: "Flex",
        numericValue: null,
        displayValue: "Flex",
        higherIsBetter: true,
        isNumeric: false,
      },
    ],
  },
];

function renderTable(specs: SpecGrouped[]) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <SpecTable specs={specs} />
    </NextIntlClientProvider>,
  );
}

describe("SpecTable", () => {
  it("renders grouped spec sections with labels", () => {
    renderTable(sampleSpecs);
    expect(screen.getByText("Motor")).toBeInTheDocument();
    expect(screen.getByText("Potência")).toBeInTheDocument();
  });

  it("displays normalized values with unit", () => {
    renderTable(sampleSpecs);
    expect(screen.getByText("120 cv")).toBeInTheDocument();
    expect(screen.getByText("9,9 s")).toBeInTheDocument();
    expect(screen.getByText("Flex")).toBeInTheDocument();
  });

  it("appends unit to the value instead of beside the label", () => {
    renderTable(sampleSpecs);
    expect(screen.queryByText("(cv)")).not.toBeInTheDocument();
    expect(screen.getByText("120 cv")).toBeInTheDocument();
  });

  it("renders empty state for no specs", () => {
    renderTable([]);
    expect(screen.queryByText("Motor")).not.toBeInTheDocument();
  });
});
