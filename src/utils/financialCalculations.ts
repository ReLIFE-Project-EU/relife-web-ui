import type { FundingOptions } from "../types/renovation";

/**
 * Apply funding options to calculate effective CAPEX and loan amount.
 *
 * Per design doc: Only two financing types - Self-funded or Loan.
 * - Self-funded: Homeowner pays full cost upfront
 * - Loan: Homeowner borrows a percentage of the cost
 *
 * The upfront incentive is folded into CAPEX here: the new Financial API has
 * no incentive fields, so `effectiveCost` is the post-incentive cost sent as
 * `capex`. The loan amount is computed off the same post-incentive cost.
 *
 * @param totalCost - Total renovation cost in EUR
 * @param fundingOptions - Selected financing options
 * @returns Effective (post-incentive) CAPEX and loan amount for risk assessment
 */
export function applyFundingReduction(
  totalCost: number,
  fundingOptions: FundingOptions,
): {
  effectiveCost: number;
  loanAmount: number;
} {
  const upfrontIncentivePercentage =
    fundingOptions.incentives.upfrontPercentage / 100;
  const effectiveCost = Math.max(
    0,
    totalCost * (1 - upfrontIncentivePercentage),
  );

  // Loan amount depends on financing type
  const loanAmount =
    fundingOptions.financingType === "loan"
      ? effectiveCost * (fundingOptions.loan.percentage / 100)
      : 0;

  return { effectiveCost, loanAmount };
}
