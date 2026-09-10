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

/** Input for `formatSpecValue` (subset of a grouped spec). */
export interface SpecValueInput {
  value?: string | null;
  numericValue?: string | number | null;
  displayValue?: string | null;
  unit?: string | null;
  isNumeric?: boolean;
}

/** Options for `formatSpecValue`. */
export interface FormatSpecValueOptions {
  /** Override the unit (e.g. "km/kWh" for normalized consumption). */
  unitOverride?: string | null;
  /** Number-formatting locale. Defaults to "pt-BR". */
  locale?: string;
  /** Text for absent values. Defaults to "Não informado"/"Not informed". */
  unavailableText?: string;
}

/** Format a raw spec value with its unit for display (data stays raw; unit comes from the category). */
export function formatSpecValue(spec: SpecValueInput, opts: FormatSpecValueOptions = {}): string {
  const locale = opts.locale ?? "pt-BR";
  const unit = opts.unitOverride ?? spec.unit ?? null;
  const unavailable =
    opts.unavailableText ?? (locale.startsWith("en") ? "Not informed" : "Não informado");

  if (spec.isNumeric && spec.numericValue != null && spec.numericValue !== "") {
    const num = Number(spec.numericValue);
    if (!Number.isNaN(num)) {
      const isCurrency = /^R\$/.test(unit ?? "");
      const formatted = num.toLocaleString(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: isCurrency ? 2 : 0,
      });
      return unit ? joinUnit(formatted, unit) : formatted;
    }
  }

  const raw = spec.displayValue ?? spec.value ?? null;
  if (raw == null || raw === "") return unavailable;
  return raw;
}

function joinUnit(value: string, unit: string): string {
  const u = unit.trim();
  if (/^R\$/.test(u)) return `R$ ${value}`;
  if (u === "%") return `${value}%`;
  return `${value} ${u}`;
}

export function formatMonthYear(date: Date | string | null | undefined, locale = "pt-BR"): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(locale, { month: "2-digit", year: "numeric" });
}

export function formatDate(date: Date | string | null | undefined, locale = "pt-BR"): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(locale);
}
