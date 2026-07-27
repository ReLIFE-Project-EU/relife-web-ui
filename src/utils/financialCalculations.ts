import type { FundingOptions } from "../types/renovation";

/**
 * Apply funding options to calculate the subsidy, effective CAPEX and loan
 * amount.
 *
 * Per design doc: Only two financing types - Self-funded or Loan.
 * - Self-funded: Homeowner pays full cost upfront
 * - Loan: Homeowner borrows a percentage of the cost
 *
 * The upfront subsidy is folded into CAPEX here: the new Financial API has
 * no incentive fields, so `effectiveCost` is the post-subsidy cost sent as
 * `capex`. The loan amount is computed off the same post-subsidy cost.
 *
 * This is the single source of every funding figure in the app — UI summaries
 * must call it rather than re-deriving the split, so previews cannot drift from
 * what is actually sent to the service.
 *
 * @param totalCost - Total renovation cost in EUR
 * @param fundingOptions - Selected financing options
 * @returns Resolved subsidy, effective (post-subsidy) CAPEX, and loan amount
 */
export function applyFundingReduction(
  totalCost: number,
  fundingOptions: FundingOptions,
): {
  effectiveCost: number;
  loanAmount: number;
  subsidyAmount: number;
} {
  const { incentives } = fundingOptions;
  const requestedSubsidy =
    incentives.mode === "amount"
      ? incentives.upfrontAmount
      : totalCost * (incentives.upfrontPercentage / 100);

  // A fixed amount is not self-limiting the way a percentage is, so clamp to
  // the cost: the service rejects a non-positive `capex`.
  const subsidyAmount = Math.min(Math.max(0, requestedSubsidy), totalCost);
  const effectiveCost = totalCost - subsidyAmount;

  // Loan amount depends on financing type
  const loanAmount =
    fundingOptions.financingType === "loan"
      ? effectiveCost * (fundingOptions.loan.percentage / 100)
      : 0;

  return { effectiveCost, loanAmount, subsidyAmount };
}
