/** Format a BRL price string from the DB (stored as "98500") to "R$ 98.500". */
export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Format a plain number with pt-BR locale (e.g., 120 → "120", 17.5 → "17,5"). */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Format a percent like 23.4 → "23,4%". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Locale-aware currency formatting. */
export function formatCurrency(
  value: string | number | null | undefined,
  locale = "pt-BR",
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  const currency = locale.startsWith("en") ? "BRL" : "BRL";
  return num.toLocaleString(locale, { style: "currency", currency, maximumFractionDigits: 0 });
}
