import { describe, expect, it } from "vitest";
import { powertrainOf } from "@/lib/catalog/powertrain";
import type { fuelType } from "@/lib/db/schema";

type Fuel = (typeof fuelType.enumValues)[number];

describe("powertrainOf", () => {
  it("maps combustion fuels to combustion", () => {
    const fuels: Fuel[] = ["gasoline", "ethanol", "flex", "diesel"];
    for (const f of fuels) expect(powertrainOf(f)).toBe("combustion");
  });

  it("maps hybrid fuels to hybrid", () => {
    const fuels: Fuel[] = ["hybrid", "hybrid_plug_in", "flex_hybrid"];
    for (const f of fuels) expect(powertrainOf(f)).toBe("hybrid");
  });

  it("maps electric to electric", () => {
    expect(powertrainOf("electric")).toBe("electric");
  });
});
