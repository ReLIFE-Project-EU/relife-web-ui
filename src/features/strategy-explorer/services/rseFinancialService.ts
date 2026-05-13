import { financial } from "../../../api/financial";
import type { ArchetypeDetails } from "../../../types/archetype";
import type {
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "../../../types/financial";
import {
  RSE_FINANCIAL_DEFAULTS,
  RSE_FINANCIAL_OUTPUT_LEVEL,
  RSE_UNAVAILABLE_REASONS,
  type RSEPackageId,
} from "../constants";
import type {
  RSEArchetypeRef,
  RSEFinancialAssumptions,
  RSEFinancialResult,
} from "../types";
import { computePackageCost } from "./rsePackageCatalog";

export const RSE_NON_POSITIVE_ENERGY_SAVINGS_REASON =
  RSE_UNAVAILABLE_REASONS.nonPositiveEnergySavings;

/**
 * Input for computing financial results for a single (archetype, package)
 * combination.
 */
export interface RSEFinancialServiceInput {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  details: ArchetypeDetails;
  annualEnergySavingsKwh: number;
  financialAssumptions?: RSEFinancialAssumptions;
}

/**
 * Compute financial indicators for a single (archetype, package) via the
 * Financial API risk-assessment endpoint.
 *
 * Skips ARV.  Always requests `output_level: "professional"`.  Falls back to
 * `RSE_FINANCIAL_DEFAULTS` when `financialAssumptions` is omitted.
 *
 * @returns Normalised `RSEFinancialResult` with camelCase point forecasts,
 *   percentiles, and probabilities when available.
 */
export async function computeFinancials(
  input: RSEFinancialServiceInput,
): Promise<RSEFinancialResult> {
  const assumptions = input.financialAssumptions ?? {
    projectLifetimeYears: RSE_FINANCIAL_DEFAULTS.projectLifetimeYears,
    financingType: RSE_FINANCIAL_DEFAULTS.financingType,
    upfrontIncentivePercentage:
      RSE_FINANCIAL_DEFAULTS.upfrontIncentivePercentage,
    lifetimeIncentiveAmountEur:
      RSE_FINANCIAL_DEFAULTS.lifetimeIncentiveAmountEur,
    lifetimeIncentiveYears: RSE_FINANCIAL_DEFAULTS.lifetimeIncentiveYears,
  };

  const { capexEur, annualMaintenanceEur } = computePackageCost(
    input.packageId,
    input.details,
  );

  if (input.annualEnergySavingsKwh <= 0) {
    return {
      archetype: input.archetype,
      packageId: input.packageId,
      capexEur,
      annualMaintenanceEur,
      annualEnergySavingsKwh: input.annualEnergySavingsKwh,
      status: "unavailable",
      unavailableReason: RSE_NON_POSITIVE_ENERGY_SAVINGS_REASON,
      unavailableMessage:
        "Financial indicators are unavailable because this package does not produce positive annual energy savings for this archetype.",
      pointForecasts: {},
    };
  }

  const riskRequest: RiskAssessmentRequest = {
    capex: capexEur,
    annual_maintenance_cost: annualMaintenanceEur,
    annual_energy_savings: input.annualEnergySavingsKwh,
    project_lifetime: assumptions.projectLifetimeYears,
    output_level: RSE_FINANCIAL_OUTPUT_LEVEL,
    indicators: ["IRR", "NPV", "PBP", "DPP", "ROI"],
    loan_amount: 0,
    loan_term: 0,
    upfront_incentive_percentage: assumptions.upfrontIncentivePercentage,
    lifetime_incentive_amount: assumptions.lifetimeIncentiveAmountEur,
    lifetime_incentive_years: assumptions.lifetimeIncentiveYears,
  };

  const response = await financial.assessRisk(riskRequest);

  return normalizeRiskResponse(input, capexEur, annualMaintenanceEur, response);
}

/**
 * Batch version of `computeFinancials`.  Runs all calls concurrently via
 * `Promise.all`.
 */
export async function computeFinancialsBatch(
  inputs: RSEFinancialServiceInput[],
): Promise<RSEFinancialResult[]> {
  return Promise.all(inputs.map((input) => computeFinancials(input)));
}

function normalizeRiskResponse(
  input: RSEFinancialServiceInput,
  capexEur: number,
  annualMaintenanceEur: number,
  response: RiskAssessmentResponse,
): RSEFinancialResult {
  const pf = response.point_forecasts ?? {};

  return {
    archetype: input.archetype,
    packageId: input.packageId,
    capexEur,
    annualMaintenanceEur,
    annualEnergySavingsKwh: input.annualEnergySavingsKwh,
    status: "available",
    pointForecasts: {
      NPV: pf.NPV,
      IRR: pf.IRR,
      ROI: pf.ROI,
      PBP: pf.PBP,
      DPP: pf.DPP,
    },
    percentiles: response.percentiles ?? undefined,
    probabilities: response.probabilities ?? undefined,
  };
}
