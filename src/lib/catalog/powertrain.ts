import type { fuelType } from "@/lib/db/schema";

/**
 * Powertrain type — the high-level drivetrain classification derived from a
 * vehicle's fuel type. Used to determine which specs apply and how cars are
 * compared across types.
 */

export const POWERTRAINS = ["combustion", "hybrid", "electric"] as const;
export type Powertrain = (typeof POWERTRAINS)[number];

type FuelType = (typeof fuelType.enumValues)[number];

const HYBRID_FUELS: FuelType[] = ["hybrid", "hybrid_plug_in", "flex_hybrid"];

export function powertrainOf(fuel: FuelType): Powertrain {
  if (fuel === "electric") return "electric";
  if (HYBRID_FUELS.includes(fuel)) return "hybrid";
  return "combustion";
}
