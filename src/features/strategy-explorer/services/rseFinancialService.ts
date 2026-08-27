import { financial } from "../../../api/financial";
import { FinancialService } from "../../../services/FinancialService";
import { estimatePackageEmbodiedCarbonFromBui } from "../../../services/embodiedCarbon";
import { lookupPackageCostsFromDetails } from "../../../services/packageCostLookup";
import {
  buildSchemes,
  mapWireRiskResponse,
  type EmittedSchemeType,
} from "../../../services/riskAssessmentAdapter";
import { applyFundingReduction } from "../../../utils/financialCalculations";
import { computeCarrierFinancialEnergySavings } from "../../../services/carrierSavingsService";
import type { EstimatePackageCostsResult } from "../../../services/types";
import type { ArchetypeDetails } from "../../../types/archetype";
import { APIError } from "../../../types/common";
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
import { RSE_PACKAGES } from "./rsePackageCatalog";

export const RSE_NON_POSITIVE_ENERGY_SAVINGS_REASON =
  RSE_UNAVAILABLE_REASONS.nonPositiveEnergySavings;

/** Provider for the CAPEX/OPEX reference-data lookup pre-pass. */
const lookupFinancialService = new FinancialService(RSE_FINANCIAL_OUTPUT_LEVEL);

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
 * Financial API risk-assessment endpoint. Package CAPEX and maintenance come
 * from the shared EU reference-data lookup before the risk call.
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

  // Resolve gross CAPEX and annual maintenance from EU reference data via the
  // shared Financial lookup. Data-shaped failures (unsupported country, no
  // priceable measures, no reference data — the backend returns HTTP 400/422
  // for the latter) mark this combination unavailable; other API errors abort
  // the workflow, matching how the risk-assessment call behaves below.
  let costs: EstimatePackageCostsResult;
  try {
    costs = await lookupPackageCostsFromDetails(
      {
        country: input.archetype.country,
        bui: input.details.bui,
        floorArea: input.details.floorArea,
        measureIds: RSE_PACKAGES[input.packageId].measureIds,
        projectLifetime: assumptions.projectLifetimeYears,
      },
      { financial: lookupFinancialService },
    );
  } catch (error) {
    if (
      error instanceof APIError &&
      error.status !== 400 &&
      error.status !== 422
    ) {
      throw error;
    }
    return {
      archetype: input.archetype,
      packageId: input.packageId,
      capexEur: 0,
      effectiveCapexEur: 0,
      annualMaintenanceEur: 0,
      annualEnergySavingsKwh: 0,
      status: "unavailable",
      unavailableReason: RSE_UNAVAILABLE_REASONS.costLookupFailed,
      unavailableMessage:
        "Financial indicators are unavailable because CAPEX and maintenance costs could not be resolved from EU reference data for this archetype and package.",
      pointForecasts: {},
    };
  }
  const capexEur = costs.capex;
  const annualMaintenanceEur = costs.annualMaintenanceCost;

  // Resolve the portfolio-wide financing scenario. The subsidy is folded into
  // CAPEX because the service has no incentive fields; the effective value is
  // the basis of every indicator the API returns, while the gross value stays
  // for display.
  const { effectiveCost: effectiveCapexEur, loanAmount } =
    applyFundingReduction(capexEur, assumptions.funding);

  const { electricityEquivalentKwh } = computeCarrierFinancialEnergySavings(
    input.carrierSourceBreakdown.baseline,
    input.carrierSourceBreakdown.renovated,
    {
      gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
      electricityReferencePriceEurPerKwh:
        RSE_FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
    },
  );

  if (effectiveCapexEur <= 0) {
    return {
      archetype: input.archetype,
      packageId: input.packageId,
      capexEur,
      effectiveCapexEur,
      annualMaintenanceEur,
      annualEnergySavingsKwh: 0,
      status: "unavailable",
      unavailableReason: RSE_UNAVAILABLE_REASONS.fullySubsidized,
      unavailableMessage:
        "Financial indicators are unavailable because the subsidy covers the full renovation cost for this archetype and package, leaving no investment to appraise.",
      pointForecasts: {},
    };
  }

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

  const { schemes, schemeType } = buildSchemes({
    loanAmount,
    loanTerm:
      assumptions.funding.financingType === "loan"
        ? assumptions.funding.loan.duration
        : 0,
  });

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
    schemeType,
  );
}

function resolveFinancialAssumptions(
  partial?: RSEFinancialAssumptions,
): RSEFinancialAssumptions {
  return {
    projectLifetimeYears:
      partial?.projectLifetimeYears ??
      RSE_FINANCIAL_DEFAULTS.projectLifetimeYears,
    funding: partial?.funding ?? RSE_FINANCIAL_DEFAULTS.funding,
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
  schemeType: EmittedSchemeType,
): RSEFinancialResult {
  const mapped = mapWireRiskResponse(response, {
    schemeType,
    projectLifetime,
  });
  const embodiedCarbonKgCo2e = estimatePackageEmbodiedCarbonFromBui({
    bui: input.details.bui,
    floorArea: input.details.floorArea,
    measureIds: RSE_PACKAGES[input.packageId].measureIds,
  });
  const pf = mapped.pointForecasts;

  return {
    archetype: input.archetype,
    packageId: input.packageId,
    capexEur,
    effectiveCapexEur,
    annualMaintenanceEur,
    annualEnergySavingsKwh,
    embodiedCarbonKgCo2e: embodiedCarbonKgCo2e ?? undefined,
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
