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

/** Category display labels (pt-BR). */
export const categoryLabels: Record<string, string> = {
  hatch: "Hatch",
  sedan: "Sedã",
  suv: "SUV",
  pickup: "Picape",
  mpv: "Minivan",
  coupe: "Coupé",
  convertible: "Conversível",
  wagon: "Perua",
  van: "Van",
  ev: "Elétrico",
};

/** Size category display labels (pt-BR). */
export const sizeCategoryLabels: Record<string, string> = {
  compacto: "Compacto",
  médio: "Médio",
  grande: "Grande",
  "picape-compacta": "Picape Compacta",
  "picape-média": "Picape Média",
  "picape-grande": "Picape Grande",
};

/** Fuel display labels (pt-BR). */
export const fuelLabels: Record<string, string> = {
  gasoline: "Gasolina",
  ethanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  hybrid: "Híbrido",
  hybrid_plug_in: "Híbrido Plug-in",
  electric: "Elétrico",
  flex_hybrid: "Flex Híbrido",
};

/** Spec group display labels (pt-BR). */
export const specGroupLabels: Record<string, string> = {
  price: "Preço",
  engine: "Motor",
  transmission: "Transmissão",
  weight: "Peso",
  steering: "Direção",
  dimensions: "Dimensões",
  consumption: "Consumo",
  suspension: "Suspensão",
  brakes: "Freios",
  warranty: "Garantia",
  accessories: "Acessórios",
  comfort_technology: "Conforto & Tecnologia",
  safety: "Segurança",
  sales: "Vendas",
};

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
