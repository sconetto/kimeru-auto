/**
 * Cross-powertrain consumption normalization.
 *
 * Consumption is stored in different units per fuel: combustion in km/l
 * (gasoline or ethanol), electric in kWh/100km. To compare across powertrains
 * we normalize everything to a single energy-efficiency unit — km/kWh
 * (kilometers per kWh of energy), where higher is always better.
 */

const GASOLINE_KWH_PER_LITER = 8.9;
const ETHANOL_KWH_PER_LITER = 6.4;

const GASOLINE_CONSUMPTION = new Set(["consumption-city-gasoline", "consumption-highway-gasoline"]);
const ETHANOL_CONSUMPTION = new Set(["consumption-city-ethanol", "consumption-highway-ethanol"]);
const ELECTRIC_CONSUMPTION = new Set(["consumption-city-electric", "consumption-highway-electric"]);

export const CONSUMPTION_SLUGS = [
  ...GASOLINE_CONSUMPTION,
  ...ETHANOL_CONSUMPTION,
  ...ELECTRIC_CONSUMPTION,
];

export function isConsumptionSlug(slug: string): boolean {
  return (
    GASOLINE_CONSUMPTION.has(slug) ||
    ETHANOL_CONSUMPTION.has(slug) ||
    ELECTRIC_CONSUMPTION.has(slug)
  );
}

/** Convert a stored consumption value to km/kWh (higher is better). */
export function toKmPerKwh(slug: string, value: number): number | null {
  if (ELECTRIC_CONSUMPTION.has(slug)) return 100 / value;
  if (GASOLINE_CONSUMPTION.has(slug)) return value / GASOLINE_KWH_PER_LITER;
  if (ETHANOL_CONSUMPTION.has(slug)) return value / ETHANOL_KWH_PER_LITER;
  return null;
}
