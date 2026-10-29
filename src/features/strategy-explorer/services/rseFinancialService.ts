import { FinancialService } from "../../../services/FinancialService";
import { estimatePackageEmbodiedCarbon } from "../../../services/embodiedCarbon";
import { appraisePackage } from "../../../services/packageAppraisal";
import { lookupPackageCosts } from "../../../services/packageCostLookup";
import type { SimulatedBuilding } from "../../../services/simulatedBuilding";
import type { EstimatePackageCostsResult } from "../../../services/types";
import { APIError } from "../../../types/common";
import type {
  AppraisalSkipReason,
  AppraisedPackage,
} from "../../../types/renovation";
import {
  RSE_FINANCIAL_OUTPUT_LEVEL,
  RSE_UNAVAILABLE_REASONS,
  type RSEPackageId,
  type RSEUnavailableReason,
} from "../constants";
import type {
  RSEArchetypeRef,
  RSECarrierSourceBreakdown,
  RSEFinancialAssumptions,
  RSEFinancialResult,
} from "../types";
import { RSE_PACKAGES } from "./rsePackageCatalog";

/** How each skipped package appraisal reads as an excluded combination. */
const SKIPPED_APPRAISAL: Record<
  AppraisalSkipReason,
  { reason: RSEUnavailableReason; message: string }
> = {
  "fully-subsidized": {
    reason: RSE_UNAVAILABLE_REASONS.fullySubsidized,
    message:
      "Financial indicators are unavailable because the subsidy covers the full renovation cost for this archetype and package, leaving no investment to appraise.",
  },
  "non-positive-savings": {
    reason: RSE_UNAVAILABLE_REASONS.nonPositiveEnergySavings,
    message:
      "Financial indicators are unavailable because carrier-aware annual savings (gas and grid electricity at the tariffs shown) are not positive for this archetype and package.",
  },
  "missing-carrier-breakdown": {
    reason: RSE_UNAVAILABLE_REASONS.missingCarrierBreakdown,
    message:
      "Financial indicators are unavailable because the simulation did not return the gas and grid-electricity split needed to price savings for this archetype and package.",
  },
};

/** Provider for the CAPEX/OPEX reference-data lookup pre-pass. */
const lookupFinancialService = new FinancialService(RSE_FINANCIAL_OUTPUT_LEVEL);

/**
 * Input for computing financial results for a single (archetype, package)
 * combination.
 */
export interface RSEFinancialServiceInput {
  archetype: RSEArchetypeRef;
  packageId: RSEPackageId;
  /** The cached archetype and the dwelling or building the row models. */
  simulated: SimulatedBuilding;
  /** Primary energy savings (display/aggregation); not sent to the Financial API. */
  annualPrimaryEnergySavingsKwh: number;
  carrierSourceBreakdown: {
    baseline: RSECarrierSourceBreakdown;
    renovated: RSECarrierSourceBreakdown;
  };
  financialAssumptions: RSEFinancialAssumptions;
}

/**
 * Compute financial indicators for a single (archetype, package) via the
 * shared package appraisal. Package CAPEX and maintenance come from the shared
 * EU reference-data lookup before the appraisal.
 *
 * Skips ARV.  Always requests `output_level: "professional"`.
 *
 * @returns Normalised `RSEFinancialResult` with camelCase point forecasts,
 *   percentiles, and probabilities when available.
 */
export async function computeFinancials(
  input: RSEFinancialServiceInput,
): Promise<RSEFinancialResult> {
  const assumptions = input.financialAssumptions;

  // Resolve gross CAPEX and annual maintenance from EU reference data via the
  // shared Financial lookup. Data-shaped failures (unsupported country, no
  // priceable measures, no reference data — the backend returns HTTP 400/422
  // for the latter) mark this combination unavailable; other API errors abort
  // the workflow, matching how the risk-assessment call behaves below.
  let costs: EstimatePackageCostsResult;
  try {
    costs = await lookupPackageCosts(
      {
        country: input.archetype.country,
        simulated: input.simulated,
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

  // The portfolio-wide financing scenario applies to every combination; the
  // subsidy is folded into CAPEX, while the gross value stays for display.
  const { effectiveCapex, electricityEquivalentKwh, appraisal } =
    await appraisePackage({
      capex: capexEur,
      annualMaintenanceCost: annualMaintenanceEur,
      funding: assumptions.funding,
      projectLifetime: assumptions.projectLifetimeYears,
      baselineCarriers: input.carrierSourceBreakdown.baseline,
      packageCarriers: input.carrierSourceBreakdown.renovated,
      gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
      outputLevel: RSE_FINANCIAL_OUTPUT_LEVEL,
    });

  if (appraisal.kind === "skipped") {
    const skipped = SKIPPED_APPRAISAL[appraisal.reason];
    return {
      archetype: input.archetype,
      packageId: input.packageId,
      capexEur,
      effectiveCapexEur: effectiveCapex,
      annualMaintenanceEur,
      annualEnergySavingsKwh: electricityEquivalentKwh,
      status: "unavailable",
      unavailableReason: skipped.reason,
      unavailableMessage: skipped.message,
      pointForecasts: {},
    };
  }

  return normalizeAppraisal(
    input,
    capexEur,
    effectiveCapex,
    annualMaintenanceEur,
    electricityEquivalentKwh,
    appraisal,
  );
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

function normalizeAppraisal(
  input: RSEFinancialServiceInput,
  capexEur: number,
  effectiveCapexEur: number,
  annualMaintenanceEur: number,
  annualEnergySavingsKwh: number,
  appraisal: AppraisedPackage,
): RSEFinancialResult {
  const embodiedCarbonKgCo2e = estimatePackageEmbodiedCarbon({
    simulated: input.simulated,
    measureIds: RSE_PACKAGES[input.packageId].measureIds,
  });
  const pf = appraisal.pointForecasts;

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
      IRR: pf.IRR ?? undefined,
      ROI: pf.ROI ?? undefined,
      PBP: pf.PBP,
      DPP: pf.DPP,
    },
    percentiles: appraisal.percentiles,
    probabilities: appraisal.probabilities,
    cashFlow: appraisal.cashFlowData?.annual_net_cash_flow
      ? {
          years: appraisal.cashFlowData.years,
          annualNetCashFlowEur: appraisal.cashFlowData.annual_net_cash_flow,
        }
      : undefined,
  };
}
