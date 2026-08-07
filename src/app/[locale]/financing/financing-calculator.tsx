"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { calculateFinancing, formatRate, solveMonthlyRate } from "@/lib/financing/calculate";
import { formatBRL } from "@/lib/format";

const TERM_OPTIONS = [12, 24, 36, 48, 60];

type InputMode = "rate" | "installment";

export function FinancingCalculator({ initialPrice }: { initialPrice?: number }) {
  const t = useTranslations("financing");
  const [price, setPrice] = useState(initialPrice ?? 100_000);
  const [downPayment, setDownPayment] = useState(20_000);
  const [monthlyRatePct, setMonthlyRatePct] = useState(1.49);
  const [targetInstallment, setTargetInstallment] = useState(2_000);
  const [inputMode, setInputMode] = useState<InputMode>("rate");
  const [termMonths, setTermMonths] = useState(48);
  const [tac, setTac] = useState(950);
  const [insurance, setInsurance] = useState(1_200);
  const [registration, setRegistration] = useState(300);

  const maxDownPayment = Math.max(0, price - 1);
  // Guard: down payment must stay strictly below the vehicle price, otherwise
  // there is nothing to finance (financed amount would be 0).
  const safeDownPayment = Math.min(downPayment, maxDownPayment);

  const financed = Math.max(0, price - safeDownPayment);

  // When inputting by installment, derive the implied rate; otherwise use the slider.
  const effectiveMonthlyRate = useMemo(() => {
    if (inputMode === "rate") return monthlyRatePct / 100;
    return solveMonthlyRate(financed, targetInstallment, termMonths);
  }, [inputMode, monthlyRatePct, financed, targetInstallment, termMonths]);

  const result = useMemo(
    () =>
      calculateFinancing({
        price,
        downPayment: safeDownPayment,
        monthlyRate: effectiveMonthlyRate,
        termMonths,
        tac,
        insurance,
        registration,
      }),
    [price, safeDownPayment, effectiveMonthlyRate, termMonths, tac, insurance, registration],
  );

  const downPct = price > 0 ? Math.round((safeDownPayment / price) * 100) : 0;

  /* Term comparison (same params, different terms) */
  const termComparison = useMemo(
    () =>
      TERM_OPTIONS.map((term) => {
        const r = calculateFinancing({
          price,
          downPayment: safeDownPayment,
          monthlyRate: effectiveMonthlyRate,
          termMonths: term,
          tac,
          insurance,
          registration,
        });
        return { term, monthlyPayment: r.monthlyPayment, totalPaid: r.totalPaid, cet: r.cetAnnual };
      }),
    [price, safeDownPayment, effectiveMonthlyRate, tac, insurance, registration],
  );

  /* Cost breakdown for the bar */
  const totalCost = result.totalPaid;
  const principalShare = result.financedAmount;
  const interestShare = result.totalInterest;
  const feesShare = result.totalFees;

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      {/* Inputs */}
      <div className="h-fit space-y-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {/* Mode toggle: calculate by interest rate or by target installment */}
        <fieldset
          className="flex rounded-md bg-slate-100 p-1 dark:bg-slate-800"
          aria-label={t("modeLabel")}
        >
          <button
            type="button"
            onClick={() => setInputMode("rate")}
            aria-pressed={inputMode === "rate"}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              inputMode === "rate"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t("modeRate")}
          </button>
          <button
            type="button"
            onClick={() => setInputMode("installment")}
            aria-pressed={inputMode === "installment"}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              inputMode === "installment"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t("modeInstallment")}
          </button>
        </fieldset>

        <Field label={t("vehiclePrice")} value={formatBRL(price)}>
          <input
            type="range"
            min={20_000}
            max={500_000}
            step={1_000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label={t("vehiclePrice")}
          />
          <CurrencyInput
            id="price-exact"
            value={price}
            min={20_000}
            max={500_000}
            ariaLabel={`${t("vehiclePrice")} (R$)`}
            onChange={setPrice}
          />
        </Field>

        <Field label={`${t("downPayment")} (${downPct}%)`} value={formatBRL(safeDownPayment)}>
          <input
            type="range"
            min={0}
            max={maxDownPayment}
            step={1_000}
            value={safeDownPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label={t("downPayment")}
          />
          <CurrencyInput
            id="down-payment-exact"
            value={safeDownPayment}
            min={0}
            max={maxDownPayment}
            ariaLabel={`${t("downPayment")} (R$)`}
            onChange={setDownPayment}
          />
        </Field>

        {inputMode === "rate" ? (
          <Field
            label={t("interestRate")}
            value={`${monthlyRatePct.toLocaleString("pt-BR")}% ${t("perMonth")}`}
          >
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.01}
              value={monthlyRatePct}
              onChange={(e) => setMonthlyRatePct(Number(e.target.value))}
              className="w-full accent-blue-600"
              aria-label={t("monthlyRate")}
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0,5%</span>
              <span>4%</span>
            </div>
          </Field>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="target-installment"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("targetInstallment")}
              </label>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatBRL(targetInstallment)}
              </span>
            </div>
            <CurrencyInput
              id="target-installment"
              value={targetInstallment}
              min={0}
              ariaLabel={t("targetInstallment")}
              onChange={setTargetInstallment}
            />
            <p className="mt-2 text-xs text-slate-500">
              {t("impliedRate")} {formatRate(effectiveMonthlyRate)} {t("perMonth")} (
              {formatRate(result.effectiveAnnualRate)} {t("annualRate")})
            </p>
            {effectiveMonthlyRate === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {formatBRL(financed / termMonths)}
              </p>
            )}
          </div>
        )}

        <Field label={t("term")} value={`${termMonths} ${t("months")}`}>
          <div className="flex flex-wrap gap-2">
            {TERM_OPTIONS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setTermMonths(term)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  term === termMonths
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {term}m
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <FeeInput label={t("tacFee")} tooltip={t("tacTooltip")} value={tac} onChange={setTac} />
          <FeeInput
            label={t("insuranceFee")}
            tooltip={t("insuranceTooltip")}
            value={insurance}
            onChange={setInsurance}
          />
          <FeeInput
            label={t("registrationFee")}
            tooltip={t("registrationTooltip")}
            value={registration}
            onChange={setRegistration}
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ResultCard
            label={t("monthlyPayment")}
            value={formatBRL(result.monthlyPayment)}
            highlight
          />
          <ResultCard label={t("cetMonthly")} value={formatRate(result.cetMonthly)} highlight />
          <ResultCard label={t("cetAnnual")} value={formatRate(result.cetAnnual)} highlight />
          <ResultCard label={t("financedAmount")} value={formatBRL(result.financedAmount)} />
          <ResultCard
            label={t("effectiveMonthlyRate")}
            value={formatRate(result.effectiveMonthlyRate)}
          />
          <ResultCard
            label={t("effectiveAnnualRate")}
            value={formatRate(result.effectiveAnnualRate)}
          />
          <ResultCard label={t("totalPaid")} value={formatBRL(result.totalPaid)} />
          <ResultCard label={t("totalInterest")} value={formatBRL(result.totalInterest)} />
          <ResultCard label={t("iof")} value={formatBRL(result.iof)} />
        </div>

        {/* Cost breakdown bar */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            {t("costComposition")}
          </h3>
          {totalCost > 0 && (
            <div className="flex h-6 w-full overflow-hidden rounded-md">
              <div
                className="bg-blue-600"
                style={{ width: `${(principalShare / totalCost) * 100}%` }}
                title={`${t("principal")}: ${formatBRL(principalShare)}`}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${(interestShare / totalCost) * 100}%` }}
                title={`${t("interest")}: ${formatBRL(interestShare)}`}
              />
              <div
                className="bg-red-500"
                style={{ width: `${(feesShare / totalCost) * 100}%` }}
                title={`${t("fees")}: ${formatBRL(feesShare)}`}
              />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> {t("principal")} (
              {formatBRL(principalShare)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t("interest")} (
              {formatBRL(interestShare)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> {t("fees")} (
              {formatBRL(feesShare)})
            </span>
          </div>
        </div>

        {/* Term comparison */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="px-4 py-3">{t("termComparison")}</th>
                <th className="px-4 py-3">{t("installment")}</th>
                <th className="px-4 py-3">{t("cetAnnual")}</th>
                <th className="px-4 py-3">{t("totalPaid")}</th>
              </tr>
            </thead>
            <tbody>
              {termComparison.map((row) => (
                <tr
                  key={row.term}
                  className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                    row.term === termMonths ? "bg-blue-50 dark:bg-blue-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    {row.term} {t("months")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    {formatBRL(row.monthlyPayment)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    {formatRate(row.cet)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    {formatBRL(row.totalPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Amortization table */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
            {t("amortizationTable")}
          </h3>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">{t("installment")}</th>
                  <th className="px-4 py-2">{t("payment")}</th>
                  <th className="px-4 py-2">{t("amortization")}</th>
                  <th className="px-4 py-2">{t("interest")}</th>
                  <th className="px-4 py-2">{t("balance")}</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((inst) => (
                  <tr key={inst.number} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-1.5 text-slate-500">
                      {inst.number}
                      {t("ordinalSuffix")}
                    </td>
                    <td className="px-4 py-1.5 text-slate-900 dark:text-white">
                      {formatBRL(inst.payment)}
                    </td>
                    <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">
                      {formatBRL(inst.principal)}
                    </td>
                    <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">
                      {formatBRL(inst.interest)}
                    </td>
                    <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">
                      {formatBRL(inst.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
      </div>
      {children}
    </div>
  );
}

function FeeInput({
  label,
  tooltip,
  value,
  onChange,
}: {
  label: string;
  value: number;
  tooltip: string;
  onChange: (v: number) => void;
}) {
  const inputId = `fee-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 flex items-center gap-1 text-xs text-slate-500">
        {label}
        <span
          tabIndex={0}
          role="button"
          aria-label={tooltip}
          className="group relative inline-flex cursor-help rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Info className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 group-focus:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400 dark:group-focus:text-blue-400" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-56 rounded-md bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 dark:bg-slate-700">
            {tooltip}
          </span>
        </span>
      </label>
      <CurrencyInput
        id={inputId}
        value={value}
        min={0}
        ariaLabel={label}
        onChange={onChange}
        className=""
      />
    </div>
  );
}

/**
 * pt-BR-aware money parsing: comma is always decimal; a trailing 3-digit
 * dot group is a thousands separator (1.500 → 1500), otherwise dot is decimal.
 */
function parseNumericInput(raw: string): number {
  const text = raw.trim();
  if (!text) return 0;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    return Number(text.replace(/\./g, "").replace(",", "."));
  }
  if (hasComma) {
    return Number(text.replace(",", "."));
  }
  if (hasDot) {
    if (/\.\d{3}$/.test(text)) {
      return Number(text.replace(/\./g, ""));
    }
    return Number(text);
  }
  return Number(text);
}

function CurrencyInput({
  id,
  value,
  min,
  max,
  ariaLabel,
  onChange,
  className = "mt-2",
}: {
  id: string;
  value: number;
  min?: number;
  max?: number;
  ariaLabel: string;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={editing ? draft : formatBRL(value)}
      onFocus={(e) => {
        setEditing(true);
        setDraft(String(value));
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseNumericInput(e.target.value);
        if (!Number.isNaN(parsed)) {
          onChange(Math.min(max ?? Infinity, Math.max(min ?? 0, parsed)));
        }
      }}
      onBlur={() => setEditing(false)}
      className={`${className} w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm tabular-nums text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white`}
      aria-label={ariaLabel}
    />
  );
}

function ResultCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-blue-600 bg-blue-50 dark:bg-blue-500/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${highlight ? "text-blue-700 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
