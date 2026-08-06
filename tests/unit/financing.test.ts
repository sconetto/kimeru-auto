import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  calculateFinancing,
  computeCetMonthly,
  computeIof,
  computePricePayment,
  formatRate,
  monthlyToAnnual,
  solveMonthlyRate,
} from "@/lib/financing/calculate";

describe("computeIof", () => {
  it("applies 0.38% fixed + 0.0082% daily", () => {
    // R$10.000 for 12 months
    const iof = computeIof(10_000, 12);
    const expected = 10_000 * 0.0038 + 10_000 * 0.000082 * 12 * 30;
    expect(iof).toBeCloseTo(expected, 6);
    expect(iof).toBeCloseTo(333.2, 1);
  });

  it("is zero for zero financed amount", () => {
    expect(computeIof(0, 12)).toBe(0);
  });
});

describe("computePricePayment", () => {
  it("computes PRICE table payment correctly", () => {
    // R$50.000 at 1.5%/month for 24 months
    const pmt = computePricePayment(50_000, 0.015, 24);
    // Known value from financial calculators: ~R$2.496,21
    expect(pmt).toBeCloseTo(2496.21, 2);
  });

  it("handles zero interest rate (simple division)", () => {
    expect(computePricePayment(12_000, 0, 12)).toBeCloseTo(1000, 6);
  });
});

describe("computeCetMonthly", () => {
  it("returns the contract rate when there are no fees", () => {
    // If PMT is exactly the PRICE payment at 1.5% a.m., CET == 1.5%
    const pmt = computePricePayment(10_000, 0.015, 12);
    const cet = computeCetMonthly(10_000, pmt, 12);
    expect(cet).toBeCloseTo(0.015, 4);
  });

  it("returns a higher CET when payments are higher than the pure contract rate", () => {
    // Higher payment than 1.5% implies a higher effective cost
    const pmt = computePricePayment(10_000, 0.03, 12);
    const cet = computeCetMonthly(10_000, pmt, 12);
    expect(cet).toBeGreaterThan(0.015);
    expect(cet).toBeCloseTo(0.03, 4);
  });
});

describe("monthlyToAnnual", () => {
  it("converts 1.5% a.m. to ~19.56% a.a.", () => {
    expect(monthlyToAnnual(0.015)).toBeCloseTo(0.1956, 3);
  });
});

describe("calculateFinancing", () => {
  it("computes a full financing with fees", () => {
    const result = calculateFinancing({
      price: 100_000,
      downPayment: 20_000,
      monthlyRate: 0.015,
      termMonths: 48,
      tac: 950,
      insurance: 1_200,
      registration: 300,
    });

    expect(result.financedAmount).toBe(80_000);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.totalFees).toBeGreaterThan(0);
    expect(result.schedule).toHaveLength(48);
    // CET with fees must be >= contract annual rate (1.5% a.m. = 19.56% a.a.)
    expect(result.cetAnnual).toBeGreaterThan(result.effectiveAnnualRate);
    // Final balance should amortize to ~0
    expect(result.schedule[47].balance).toBeLessThan(1);
  });

  it("CET exceeds contract rate when only mandatory IOF applies", () => {
    const result = calculateFinancing({
      price: 100_000,
      downPayment: 20_000,
      monthlyRate: 0.015,
      termMonths: 48,
    });
    // IOF is mandatory (0.38% + 0.0082%/day) — no optional fees, but CET
    // must still exceed the contract annual rate because IOF is charged.
    expect(result.iof).toBeGreaterThan(0);
    expect(result.cetMonthly).toBeGreaterThan(0.015);
    expect(result.totalFees).toBe(result.iof);
  });

  it("handles full down payment (zero financed)", () => {
    const result = calculateFinancing({
      price: 100_000,
      downPayment: 100_000,
      monthlyRate: 0.015,
      termMonths: 48,
    });
    // Down payment is clamped to price - 1 so there is always something to finance.
    expect(result.financedAmount).toBe(1);
    expect(result.monthlyPayment).toBeGreaterThan(0);
  });

  it("returns a zeroed result when price is 0", () => {
    const result = calculateFinancing({
      price: 0,
      downPayment: 0,
      monthlyRate: 0.015,
      termMonths: 48,
    });
    expect(result.financedAmount).toBe(0);
    expect(result.monthlyPayment).toBe(0);
    expect(result.schedule).toHaveLength(0);
    expect(Number.isNaN(result.cetAnnual)).toBe(false);
  });

  it("handles zero term without division by zero", () => {
    const result = calculateFinancing({
      price: 50_000,
      downPayment: 10_000,
      monthlyRate: 0.015,
      termMonths: 0,
    });
    // Term is clamped to a minimum of 1 month.
    expect(Number.isNaN(result.monthlyPayment)).toBe(false);
    expect(result.schedule).toHaveLength(1);
  });

  it("clamps negative rate to zero instead of NaN", () => {
    const result = calculateFinancing({
      price: 50_000,
      downPayment: 10_000,
      monthlyRate: -0.5,
      termMonths: 48,
    });
    expect(Number.isNaN(result.monthlyPayment)).toBe(false);
    expect(result.monthlyPayment).toBeCloseTo(40_000 / 48, 0);
  });
});

describe("buildSchedule", () => {
  it("amortizes principal to zero by the last installment", () => {
    const schedule = buildSchedule(50_000, 0.015, 24, 2497.26);
    expect(schedule).toHaveLength(24);
    expect(schedule[0].interest).toBeCloseTo(750, 0);
    expect(schedule[23].balance).toBeLessThan(5);
    // Interest portion decreases over time
    expect(schedule[23].interest).toBeLessThan(schedule[0].interest);
  });
});

describe("solveMonthlyRate", () => {
  it("recovers the rate from a known payment (round-trip)", () => {
    // PMT at 1.5% a.m. for 24 months, then solve back to 1.5%
    const pmt = computePricePayment(50_000, 0.015, 24);
    const rate = solveMonthlyRate(50_000, pmt, 24);
    expect(rate).toBeCloseTo(0.015, 6);
  });

  it("reproduces the target payment at the solved rate", () => {
    const target = 2_497.26; // ~1.5% a.m. on 50k / 24mo
    const rate = solveMonthlyRate(50_000, target, 24);
    const rebuilt = computePricePayment(50_000, rate, 24);
    expect(rebuilt).toBeCloseTo(target, 4);
  });

  it("returns 0 when target is at or below the zero-rate payment", () => {
    // Zero-rate payment = PV / n
    expect(solveMonthlyRate(50_000, 50_000 / 24, 24)).toBe(0);
    expect(solveMonthlyRate(50_000, 1_000, 24)).toBe(0); // below minimum
  });

  it("returns 0 for invalid inputs", () => {
    expect(solveMonthlyRate(0, 100, 24)).toBe(0);
    expect(solveMonthlyRate(50_000, 0, 24)).toBe(0);
    expect(solveMonthlyRate(50_000, 100, 0)).toBe(0);
  });

  it("yields higher rates for higher target payments", () => {
    const r1 = solveMonthlyRate(50_000, 2_500, 24);
    const r2 = solveMonthlyRate(50_000, 2_800, 24);
    expect(r2).toBeGreaterThan(r1);
  });
});

describe("formatRate", () => {
  it("formats as Brazilian percentage", () => {
    expect(formatRate(0.2247)).toBe("22,47%");
  });
});
