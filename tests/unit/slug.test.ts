import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/catalog/slug";

describe("slugify", () => {
  it("lowercases input", () => {
    expect(slugify("HONDA")).toBe("honda");
  });

  it("strips accents", () => {
    expect(slugify("Civic Geração")).toBe("civic-geracao");
    expect(slugify("Fiat Strada")).toBe("fiat-strada");
  });

  it("replaces non-alphanumeric runs with a single hyphen", () => {
    expect(slugify("Toyota Corolla")).toBe("toyota-corolla");
    expect(slugify("Fiat  Strada  2024!")).toBe("fiat-strada-2024");
    expect(slugify("Peugeot 208 (2025)")).toBe("peugeot-208-2025");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Honda  ")).toBe("honda");
    expect(slugify("- Civic -")).toBe("civic");
  });

  it("returns empty string for input with no alphanumerics", () => {
    expect(slugify("---")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});
