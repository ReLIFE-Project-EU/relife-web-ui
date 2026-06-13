import { financial } from "../../../api/financial";
import {
  buildSchemes,
  mapWireRiskResponse,
} from "../../../services/riskAssessmentAdapter";
import { computeCarrierFinancialEnergySavings } from "../../../services/carrierSavingsService";
import type { ArchetypeDetails } from "../../../types/archetype";
import type {
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "../../../types/financial";
import {
  RSE_ENERGY_TARIFF_DEFAULTS,
  RSE_FINANCIAL_DEFAULTS,
  RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
  RSE_FINANCIAL_OUTPUT_LEVEL,
  RSE_UNAVAILABLE_REASONS,
  type RSEPackageId,
} from "../constants";
import type {
  RSEArchetypeRef,
  RSECarrierSourceBreakdown,
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
  /** Primary energy savings (display/aggregation); not sent to the Financial API. */
  annualPrimaryEnergySavingsKwh: number;
  carrierSourceBreakdown: {
    baseline: RSECarrierSourceBreakdown;
    renovated: RSECarrierSourceBreakdown;
  };
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
  const assumptions = resolveFinancialAssumptions(input.financialAssumptions);

  const { capexEur, annualMaintenanceEur } = computePackageCost(
    input.packageId,
    input.details,
  );

  // Fold the upfront incentive into CAPEX (the new contract has no incentive
  // fields). RSE is always self-funded, so the scheme is always equity. The
  // effective value is the basis of every indicator the API returns; the
  // gross value stays for display.
  const effectiveCapexEur = Math.max(
    0,
    capexEur * (1 - assumptions.upfrontIncentivePercentage / 100),
  );

  const { electricityEquivalentKwh } = computeCarrierFinancialEnergySavings(
    input.carrierSourceBreakdown.baseline,
    input.carrierSourceBreakdown.renovated,
    {
      gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
      electricityReferencePriceEurPerKwh:
        RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
    },
  );

  if (electricityEquivalentKwh <= 0) {
    return {
      archetype: input.archetype,
      packageId: input.packageId,
      capexEur,
      effectiveCapexEur,
      annualMaintenanceEur,
      annualEnergySavingsKwh: electricityEquivalentKwh,
      status: "unavailable",
      unavailableReason: RSE_NON_POSITIVE_ENERGY_SAVINGS_REASON,
      unavailableMessage:
        "Financial indicators are unavailable because carrier-aware annual savings (gas and grid electricity at the tariffs shown) are not positive for this archetype and package.",
      pointForecasts: {},
    };
  }

  const { schemes } = buildSchemes({ loanAmount: 0, loanTerm: 0 });

  const riskRequest: RiskAssessmentRequest = {
    capex: effectiveCapexEur,
    annual_maintenance_cost: annualMaintenanceEur,
    annual_energy_savings: electricityEquivalentKwh,
    project_lifetime: assumptions.projectLifetimeYears,
    output_level: RSE_FINANCIAL_OUTPUT_LEVEL,
    indicators: ["IRR", "NPV", "PBP", "DPP", "ROI"],
    schemes,
  };

  const response = await financial.assessRisk(riskRequest);

  return normalizeRiskResponse(
    input,
    capexEur,
    effectiveCapexEur,
    annualMaintenanceEur,
    electricityEquivalentKwh,
    response,
    assumptions.projectLifetimeYears,
  );
}

function resolveFinancialAssumptions(
  partial?: RSEFinancialAssumptions,
): RSEFinancialAssumptions {
  return {
    projectLifetimeYears:
      partial?.projectLifetimeYears ??
      RSE_FINANCIAL_DEFAULTS.projectLifetimeYears,
    financingType:
      partial?.financingType ?? RSE_FINANCIAL_DEFAULTS.financingType,
    upfrontIncentivePercentage:
      partial?.upfrontIncentivePercentage ??
      RSE_FINANCIAL_DEFAULTS.upfrontIncentivePercentage,
    gasTariffEurPerKwh:
      partial?.gasTariffEurPerKwh ?? RSE_ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
  };
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
  effectiveCapexEur: number,
  annualMaintenanceEur: number,
  annualEnergySavingsKwh: number,
  response: RiskAssessmentResponse,
  projectLifetime: number,
): RSEFinancialResult {
  const mapped = mapWireRiskResponse(response, {
    schemeType: "equity",
    projectLifetime,
  });
  const pf = mapped.pointForecasts;

  return {
    archetype: input.archetype,
    packageId: input.packageId,
    capexEur,
    effectiveCapexEur,
    annualMaintenanceEur,
    annualEnergySavingsKwh,
    status: "available",
    pointForecasts: {
      NPV: pf.NPV,
      IRR: pf.IRR,
      ROI: pf.ROI,
      PBP: pf.PBP,
      DPP: pf.DPP,
    },
    percentiles: mapped.percentiles,
    probabilities: mapped.probabilities,
    cashFlow: mapped.cashFlowData?.annual_net_cash_flow
      ? {
          years: mapped.cashFlowData.years,
          annualNetCashFlowEur: mapped.cashFlowData.annual_net_cash_flow,
        }
      : undefined,
  };
}
