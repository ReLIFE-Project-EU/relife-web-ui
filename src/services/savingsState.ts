/**
 * Why a renovation package's financial figures can or cannot be trusted.
 *
 * A skipped package appraisal has no figures. Classifying the reason is what
 * keeps the UI from reporting a fully-funded renovation as a failure, or
 * telling a building that could not be priced that it already meets its
 * targets.
 *
 * This deliberately stops short of judging profitability. HRA asks whether
 * running costs fall (monthly savings) and PRA asks whether the investment pays
 * off (NPV); both are right for their audience, so each applies its own test on
 * top of an `appraised` result.
 */

import type {
  AppraisalSkipReason,
  AppraisedPackage,
  FinancialResults,
  RenovationScenario,
} from "../types/renovation";

export type SavingsAvailability =
  /** The Financial service appraised the package; the figures are real. */
  | "appraised"
  /** Skipped: the package does not reduce modeled energy costs. */
  | "no-savings"
  /** Skipped: a subsidy covers the whole cost, so there is no investment. */
  | "fully-funded"
  /** Skipped: no carrier breakdown, so energy could not be priced at all. */
  | "not-priceable"
  /** No financial results, or no scenarios to compare. */
  | "unknown";

export function resolveSavingsAvailability(
  renovated: RenovationScenario | undefined,
  financials: FinancialResults | undefined,
): SavingsAvailability {
  if (!renovated || !financials) {
    return "unknown";
  }
  if (financials.appraisal.kind === "appraised") {
    return "appraised";
  }

  return skipReasonAvailability(financials.appraisal.reason);
}

/** The states a skipped appraisal can be in. */
export type SkippedAvailability = Exclude<
  SavingsAvailability,
  "appraised" | "unknown"
>;

export function skipReasonAvailability(
  reason: AppraisalSkipReason,
): SkippedAvailability {
  switch (reason) {
    case "fully-subsidized":
      return "fully-funded";
    case "missing-carrier-breakdown":
      return "not-priceable";
    case "non-positive-savings":
      return "no-savings";
  }
}

/** The appraised figures, or undefined when the appraisal was skipped. */
export function appraisedFigures(
  financials: FinancialResults | undefined,
): AppraisedPackage | undefined {
  return financials?.appraisal.kind === "appraised"
    ? financials.appraisal
    : undefined;
}

/** Short label for the state, used on badges and in exports. */
export const savingsAvailabilityLabel: Record<SavingsAvailability, string> = {
  appraised: "Analyzed",
  "no-savings": "No energy cost savings",
  "fully-funded": "Fully covered by subsidy",
  "not-priceable": "Could not be priced",
  unknown: "Not analyzed",
};

/** One sentence explaining what the state means for the figures shown. */
export const savingsAvailabilityExplanation: Record<
  SavingsAvailability,
  string
> = {
  appraised: "Financial indicators come from the full risk simulation.",
  "no-savings":
    "This package does not lower energy costs, so it was not appraised.",
  "fully-funded":
    "A subsidy covers the whole cost, so there is nothing to appraise.",
  "not-priceable":
    "Energy could not be priced, so no financial appraisal was run.",
  unknown: "No financial results are available for this building.",
};
