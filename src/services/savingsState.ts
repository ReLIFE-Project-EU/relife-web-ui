/**
 * Why a renovation package's financial figures can or cannot be trusted.
 *
 * When the Financial API's risk assessment is skipped, `FinancialResults` still
 * carries NPV, ROI and payback — as zeros that are indistinguishable from real
 * results. Classifying the reason is what keeps the UI from reporting a
 * fully-funded renovation as a failure, or telling a building that could not be
 * priced that it already meets its targets.
 *
 * This deliberately stops short of judging profitability. HRA asks whether
 * running costs fall (monthly savings) and PRA asks whether the investment pays
 * off (NPV); both are right for their audience, so each applies its own test on
 * top of an `appraised` result.
 */

import type { FinancialResults, RenovationScenario } from "../types/renovation";

export type SavingsAvailability =
  /** The risk assessment ran; the financial figures are real. */
  | { kind: "appraised" }
  /** Skipped: no measurable energy saving left to appraise. */
  | { kind: "no-savings" }
  /** Skipped: a subsidy covers the whole cost, so there is no investment. */
  | { kind: "fully-funded" }
  /** Skipped: no carrier breakdown, so energy could not be priced at all. */
  | { kind: "not-priceable" }
  /** No financial results, or no scenarios to compare. */
  | { kind: "unknown" };

export function resolveSavingsAvailability(
  renovated: RenovationScenario | undefined,
  financials: FinancialResults | undefined,
): SavingsAvailability {
  if (!renovated || !financials) {
    return { kind: "unknown" };
  }
  if (financials.riskAssessment !== null) {
    return { kind: "appraised" };
  }

  switch (financials.riskSkippedReason) {
    case "fully-subsidized":
      return { kind: "fully-funded" };
    case "missing-carrier-breakdown":
      return { kind: "not-priceable" };
    case "non-positive-savings":
      return { kind: "no-savings" };
    default:
      // A result predating the reason field, or one built by a mock.
      return { kind: "unknown" };
  }
}

/** Short label for the state, used on badges and in exports. */
export const savingsAvailabilityLabel: Record<
  SavingsAvailability["kind"],
  string
> = {
  appraised: "Analysed",
  "no-savings": "Already at renovation target",
  "fully-funded": "Fully covered by subsidy",
  "not-priceable": "Could not be priced",
  unknown: "Not analysed",
};

/** One sentence explaining what the state means for the figures shown. */
export const savingsAvailabilityExplanation: Record<
  SavingsAvailability["kind"],
  string
> = {
  appraised: "Financial indicators come from the full risk simulation.",
  "no-savings":
    "This building already meets the targets for the selected measures, so there were no savings to appraise and the financial indicators are not meaningful.",
  "fully-funded":
    "A subsidy covers the whole cost, so there is no investment left to appraise. The renovation still delivers its energy savings.",
  "not-priceable":
    "The simulation did not return the fuel breakdown needed to price energy, so no financial appraisal could be run.",
  unknown: "No financial results are available for this building.",
};
