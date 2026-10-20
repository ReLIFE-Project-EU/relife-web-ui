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

/**
 * Payback from a pooled cash-flow series: each contributor's net cash flows are
 * scaled by its count and summed, then payback is the year from which the
 * cumulative total stays non-negative, interpolated linearly (the same
 * convention as the backend PBP). It is 0 when the total never goes negative.
 * Averaging individual payback periods would weight buildings instead of euros
 * and silently drop the ones that never break even, so it is avoided.
 *
 * Returns `undefined` when a contributor lacks a series, the series disagree on
 * length, or the pooled total is still negative in the last year.
 */
export function computePooledPaybackYears(
  contributions: Array<{ netByYear: number[]; count: number } | null>,
): number | undefined {
  if (contributions.length === 0) {
    return undefined;
  }
  const series: Array<{ netByYear: number[]; count: number }> = [];
  for (const contribution of contributions) {
    if (contribution === null) {
      return undefined;
    }
    series.push(contribution);
  }

  const yearCount = series[0].netByYear.length;
  if (
    yearCount < 2 ||
    series.some((entry) => entry.netByYear.length !== yearCount)
  ) {
    return undefined;
  }

  const pooled = new Array<number>(yearCount).fill(0);
  for (const entry of series) {
    for (let year = 0; year < yearCount; year++) {
      pooled[year] += entry.netByYear[year] * entry.count;
    }
  }

  let cumulative = 0;
  let lastNegativeYear = -1;
  let lastNegativeTotal = 0;
  for (let year = 0; year < yearCount; year++) {
    cumulative += pooled[year];
    if (cumulative < 0) {
      lastNegativeYear = year;
      lastNegativeTotal = cumulative;
    }
  }

  if (lastNegativeYear === -1) {
    return 0;
  }
  if (lastNegativeYear === yearCount - 1) {
    return undefined;
  }
  return lastNegativeYear - lastNegativeTotal / pooled[lastNegativeYear + 1];
}
