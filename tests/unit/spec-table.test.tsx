import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpecTable } from "@/components/compare/spec-table";
import type { SpecGrouped } from "@/lib/catalog/queries";

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

describe("SpecTable", () => {
  it("renders grouped spec sections with labels", () => {
    render(<SpecTable specs={sampleSpecs} />);
    expect(screen.getByText("Motor")).toBeInTheDocument();
    expect(screen.getByText("Potência")).toBeInTheDocument();
  });

  it("displays display values", () => {
    render(<SpecTable specs={sampleSpecs} />);
    expect(screen.getByText("120 cv")).toBeInTheDocument();
    expect(screen.getByText("Flex")).toBeInTheDocument();
  });

  it("renders unit hints", () => {
    render(<SpecTable specs={sampleSpecs} />);
    expect(screen.getByText("(cv)")).toBeInTheDocument();
  });

  it("renders empty state for no specs", () => {
    render(<SpecTable specs={[]} />);
    expect(screen.queryByText("Motor")).not.toBeInTheDocument();
  });
});
