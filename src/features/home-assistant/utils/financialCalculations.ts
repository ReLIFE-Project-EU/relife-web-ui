import type { FundingOptions } from "../context/types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accuracy tolerance for IRR Newton-Raphson calculation
 */
const IRR_CALCULATION_TOLERANCE = 0.0001;

/**
 * Maximum iterations for IRR Newton-Raphson calculation
 */
const IRR_MAX_ITERATIONS = 100;

/**
 * Initial guess for IRR Newton-Raphson calculation
 */
const IRR_INITIAL_GUESS = 0.1;

/**
 * Proxy for infinity when calculating years (e.g., payback period)
 * Note: This duplicates MOCK_MAX_YEARS_PROXY to avoid circular deps with mock/constants
 */
const MAX_YEARS_PROXY = 999;

// ─────────────────────────────────────────────────────────────────────────────
// Financial Calculations
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNPV(
  initialInvestment: number,
  annualSavings: number,
  discountRate: number,
  years: number,
): number {
  let npv = -initialInvestment;
  for (let year = 1; year <= years; year++) {
    npv += annualSavings / Math.pow(1 + discountRate, year);
  }
  return npv;
}

export function calculateIRR(
  initialInvestment: number,
  annualSavings: number,
  years: number,
): number {
  // Newton-Raphson method to find IRR
  let irr = IRR_INITIAL_GUESS;
  const tolerance = IRR_CALCULATION_TOLERANCE;
  const maxIterations = IRR_MAX_ITERATIONS;

  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    let derivative = 0;

    for (let year = 1; year <= years; year++) {
      const discount = Math.pow(1 + irr, year);
      npv += annualSavings / discount;
      derivative -= (year * annualSavings) / Math.pow(1 + irr, year + 1);
    }

    if (Math.abs(derivative) < tolerance) break;

    const newIrr = irr - npv / derivative;
    if (Math.abs(newIrr - irr) < tolerance) {
      irr = newIrr;
      break;
    }
    irr = newIrr;
  }

  return Math.max(0, irr); // IRR should be non-negative for display
}

export function calculateSimplePayback(
  investment: number,
  annualSavings: number,
): number {
  if (annualSavings <= 0) return MAX_YEARS_PROXY;
  return Math.min(MAX_YEARS_PROXY, investment / annualSavings);
}

export function calculateDiscountedPayback(
  investment: number,
  annualSavings: number,
  discountRate: number,
  maxYears: number = 50,
): number {
  let cumulativePV = 0;
  for (let year = 1; year <= maxYears; year++) {
    cumulativePV += annualSavings / Math.pow(1 + discountRate, year);
    if (cumulativePV >= investment) {
      // Interpolate for partial year
      const prevPV =
        cumulativePV - annualSavings / Math.pow(1 + discountRate, year);
      const fraction =
        (investment - prevPV) /
        (annualSavings / Math.pow(1 + discountRate, year));
      return year - 1 + fraction;
    }
  }
  return MAX_YEARS_PROXY;
}

export function calculateROI(investment: number, totalSavings: number): number {
  if (investment <= 0) return 0;
  return (totalSavings - investment) / investment;
}

/**
 * Apply funding options to calculate effective cost and loan amount.
 *
 * Per design doc: Only two financing types - Self-funded or Loan.
 * - Self-funded: Homeowner pays full cost upfront
 * - Loan: Homeowner borrows a percentage of the cost
 *
 * @param totalCost - Total renovation cost in EUR
 * @param fundingOptions - Selected financing options
 * @returns Effective CAPEX and loan amount for risk assessment
 */
export function applyFundingReduction(
  totalCost: number,
  fundingOptions: FundingOptions,
): {
  effectiveCost: number;
  loanAmount: number;
} {
  // CAPEX is always the total renovation cost
  const effectiveCost = totalCost;

  // Loan amount depends on financing type
  const loanAmount =
    fundingOptions.financingType === "loan"
      ? totalCost * (fundingOptions.loan.percentage / 100)
      : 0;

  return { effectiveCost, loanAmount };
}
