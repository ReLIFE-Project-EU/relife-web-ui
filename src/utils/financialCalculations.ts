import type { FundingOptions } from "../types/renovation";

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
  const upfrontIncentivePercentage =
    fundingOptions.incentives.upfrontPercentage / 100;
  const postIncentiveCost = Math.max(
    0,
    totalCost * (1 - upfrontIncentivePercentage),
  );

  // Loan amount depends on financing type
  const loanAmount =
    fundingOptions.financingType === "loan"
      ? postIncentiveCost * (fundingOptions.loan.percentage / 100)
      : 0;

  return { effectiveCost, loanAmount };
}

export function sanitizeLifetimeIncentives(
  lifetimeAmount: number,
  lifetimeYears: number,
  projectLifetime: number,
): {
  lifetimeAmount: number;
  lifetimeYears: number;
} {
  if (lifetimeAmount <= 0 || lifetimeYears <= 0) {
    return {
      lifetimeAmount: 0,
      lifetimeYears: 0,
    };
  }

  return {
    lifetimeAmount,
    lifetimeYears: Math.min(lifetimeYears, projectLifetime),
  };
}
