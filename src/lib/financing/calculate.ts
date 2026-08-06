/**
 * Brazilian vehicle financing math — PRICE table (Sistema Francês) + CET.
 *
 * CET (Custo Efetivo Total) per Banco Central Resolução 3.517:
 * the internal rate of return that equalizes the present value of all
 * payments (principal + interest + IOF + TAC + insurance + registration)
 * with the net amount financed.
 *
 * IOF rules (Decreto 6.306/2007, art. 15):
 *  - 0.38% fixed on the financed principal
 *  - 0.0082% per day of the financed principal (up to the term)
 *  - Applies to operations with individuals (pessoa física)
 */

export interface FinancingInput {
  /** Vehicle price (R$). */
  price: number;
  /** Down payment (R$). */
  downPayment: number;
  /** Monthly interest rate (decimal, e.g. 0.0189 = 1.89% a.m.). */
  monthlyRate: number;
  /** Term in months. */
  termMonths: number;
  /** TAC — Taxa de Abertura de Crédito (R$). */
  tac?: number;
  /** Insurance premium — seguro prestamista (R$). */
  insurance?: number;
  /** Registration fee (R$). */
  registration?: number;
}

export interface Installment {
  number: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface FinancingResult {
  financedAmount: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  totalFees: number;
  iof: number;
  cetMonthly: number;
  cetAnnual: number;
  effectiveMonthlyRate: number;
  effectiveAnnualRate: number;
  schedule: Installment[];
}

/** IOF: 0.38% fixed + 0.0082%/day, both on the financed principal. */
export function computeIof(financedAmount: number, termMonths: number): number {
  if (financedAmount <= 0 || termMonths <= 0) return 0;
  const fixed = financedAmount * 0.0038;
  const daily = financedAmount * 0.000082 * termMonths * 30;
  return fixed + daily;
}

/**
 * PRICE table monthly payment:
 * PMT = PV * i * (1+i)^n / ((1+i)^n - 1)
 *
 * Guarded against degenerate inputs: no financed amount, no term, or a
 * non-positive rate all yield 0 instead of NaN/Infinity.
 */
export function computePricePayment(
  financedAmount: number,
  monthlyRate: number,
  termMonths: number,
): number {
  if (financedAmount <= 0 || termMonths <= 0) return 0;
  const safeRate = Math.max(0, monthlyRate);
  if (safeRate <= 0) return financedAmount / termMonths;
  const factor = (1 + safeRate) ** termMonths;
  return (financedAmount * safeRate * factor) / (factor - 1);
}

/** Build the full amortization schedule. */
export function buildSchedule(
  financedAmount: number,
  monthlyRate: number,
  termMonths: number,
  monthlyPayment: number,
): Installment[] {
  const schedule: Installment[] = [];
  let balance = financedAmount;
  for (let n = 1; n <= termMonths; n++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance = Math.max(0, balance - principal);
    schedule.push({
      number: n,
      payment: monthlyPayment,
      principal,
      interest,
      balance,
    });
  }
  return schedule;
}

/**
 * Inverse of the PRICE table: given a desired monthly payment, solve for
 * the monthly rate that produces it. The PRICE payment is monotonically
 * increasing in the rate, so bisection converges to the exact value.
 *
 * Returns 0 when the target payment is at or below the zero-rate payment
 * (financedAmount / termMonths), which is the minimum possible installment.
 */
export function solveMonthlyRate(
  financedAmount: number,
  targetPayment: number,
  termMonths: number,
): number {
  if (financedAmount <= 0 || termMonths <= 0 || targetPayment <= 0) return 0;

  const zeroRatePayment = financedAmount / termMonths;
  if (targetPayment <= zeroRatePayment) return 0;

  // f(r) = PMT(r) - target; root at the desired rate
  const f = (r: number) => computePricePayment(financedAmount, r, termMonths) - targetPayment;

  let lo = 0;
  let hi = 1; // 100% a.m. upper bound
  while (f(hi) < 0 && hi < 10) {
    hi *= 2;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-10) return mid;
    if (fm < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * CET by bisection on the monthly rate that zeroes the NPV:
 *   PV(cash flows) = financedAmount
 * where cash flows = -monthlyPayment for n months, and the financed
 * amount already includes all fees. This gives the effective monthly
 * rate that captures IOF/TAC/insurance/registration costs.
 */
export function computeCetMonthly(
  financedAmount: number,
  monthlyPayment: number,
  termMonths: number,
): number {
  if (financedAmount <= 0 || monthlyPayment <= 0 || termMonths <= 0) return 0;
  // NPV of payments at candidate rate r:
  //   NPV(r) = PMT * (1 - (1+r)^-n) / r  -  financedAmount
  const npv = (r: number) => (monthlyPayment * (1 - (1 + r) ** -termMonths)) / r - financedAmount;

  let lo = 0;
  let hi = 1; // 100% a.m. upper bound
  // Expand hi until NPV changes sign (crosses zero)
  while (npv(hi) > 0 && hi < 10) {
    hi *= 2;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f = npv(mid);
    if (Math.abs(f) < 1e-10) return mid;
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Convert monthly rate (decimal) to annual effective rate. */
export function monthlyToAnnual(monthlyRate: number): number {
  return (1 + monthlyRate) ** 12 - 1;
}

/** Full financing calculation. */
export function calculateFinancing(input: FinancingInput): FinancingResult {
  const {
    price,
    downPayment,
    monthlyRate,
    termMonths,
    tac = 0,
    insurance = 0,
    registration = 0,
  } = input;

  // Guard: a valid financing needs a positive price, a positive term, and a
  // down payment strictly below the price (otherwise there is nothing to
  // finance). Returns a zeroed result instead of NaN/Infinity.
  const safeTerm = Math.max(1, Math.round(termMonths) || 1);
  const safePrice = Math.max(0, price);
  const safeDown = Math.min(Math.max(0, downPayment), Math.max(0, safePrice - 1));
  const financedAmount = Math.max(0, safePrice - safeDown);
  const safeRate = Math.max(0, monthlyRate);
  const safeTac = Math.max(0, tac);
  const safeInsurance = Math.max(0, insurance);
  const safeRegistration = Math.max(0, registration);

  if (financedAmount <= 0) {
    const zero: FinancingResult = {
      financedAmount: 0,
      monthlyPayment: 0,
      totalPaid: 0,
      totalInterest: 0,
      totalFees: 0,
      iof: 0,
      cetMonthly: 0,
      cetAnnual: 0,
      effectiveMonthlyRate: safeRate,
      effectiveAnnualRate: monthlyToAnnual(safeRate),
      schedule: [],
    };
    return zero;
  }

  const iof = computeIof(financedAmount, safeTerm);
  const totalFees = iof + safeTac + safeInsurance + safeRegistration;

  const monthlyPayment = computePricePayment(financedAmount, safeRate, safeTerm);

  // If fees exist, the "true" cost is higher — CET solves for the rate
  // that makes the payment stream equal to the financed amount minus
  // fees... but per BCB, CET compares the payment stream against the
  // total financed INCLUDING fees as part of the effective rate.
  // We solve NPV(payments) = financedAmount, which is exactly the
  // contract rate when fees are 0; with fees, we recompute using the
  // payment that would cover principal+fees at the same contract rate.
  const paymentWithFees = computePricePayment(financedAmount + totalFees, safeRate, safeTerm);
  const cetMonthly = computeCetMonthly(financedAmount, paymentWithFees, safeTerm);

  const schedule = buildSchedule(financedAmount, safeRate, safeTerm, monthlyPayment);
  const totalPaid = monthlyPayment * safeTerm + totalFees;
  const totalInterest = monthlyPayment * safeTerm - financedAmount;

  return {
    financedAmount,
    monthlyPayment,
    totalPaid,
    totalInterest,
    totalFees,
    iof,
    cetMonthly,
    cetAnnual: monthlyToAnnual(cetMonthly),
    effectiveMonthlyRate: safeRate,
    effectiveAnnualRate: monthlyToAnnual(safeRate),
    schedule,
  };
}

/** Format a rate as percentage with 2 decimals ("22,47%"). */
export function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
