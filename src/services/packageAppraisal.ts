/**
 * Package appraisal shared by HRA, PRA and RSE: funding, electricity-equivalent
 * savings, skip rules, financing scheme and POST /risk-assessment.
 */

import { financial } from "../api";
import type {
  AppraisalSkipReason,
  FundingOptions,
  PackageAppraisal,
} from "../types/renovation";
import type { DeliveredEnergyCarrierBreakdown } from "../types/energy";
import type { OutputLevel } from "../utils/apiMappings";
import { applyFundingReduction } from "../utils/financialCalculations";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import {
  computeCarrierFinancialEnergySavings,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "./carrierSavingsService";
import { buildSchemes, mapWireRiskResponse } from "./riskAssessmentAdapter";

export interface PackageAppraisalInput {
  /** Gross package cost before any subsidy, EUR. */
  capex: number;
  annualMaintenanceCost: number;
  funding: FundingOptions;
  projectLifetime: number;
  baselineCarriers: DeliveredEnergyCarrierBreakdown | undefined;
  packageCarriers: DeliveredEnergyCarrierBreakdown | undefined;
  gasTariffEurPerKwh: number;
  outputLevel: OutputLevel;
  /** Events are logged only when given; the RSE passes none. */
  auditCtx?: AuditCtx;
}

export interface PackageAppraisalResult {
  /** CAPEX after subsidy: what the owner invests, appraised or not. */
  effectiveCapex: number;
  electricityEquivalentKwh: number;
  appraisal: PackageAppraisal;
}

export async function appraisePackage(
  input: PackageAppraisalInput,
): Promise<PackageAppraisalResult> {
  const {
    funding,
    baselineCarriers,
    packageCarriers,
    gasTariffEurPerKwh,
    auditCtx,
  } = input;
  const audit = auditCtx ? auditLog : undefined;
  const { effectiveCost, loanAmount, subsidyAmount } = applyFundingReduction(
    input.capex,
    funding,
  );
  const loanTerm = funding.financingType === "loan" ? funding.loan.duration : 0;

  // The Financial API accepts one scalar kWh value and prices it with the
  // electricity curve. Value gas and grid-electricity deltas separately, then
  // convert the net EUR savings into electricity-equivalent kWh.
  const canUseCarrierPricing =
    baselineCarriers !== undefined && packageCarriers !== undefined;
  const { annualSavingsEur, electricityEquivalentKwh } = canUseCarrierPricing
    ? computeCarrierFinancialEnergySavings(baselineCarriers, packageCarriers, {
        gasTariffEurPerKwh,
        electricityReferencePriceEurPerKwh:
          FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      })
    : { annualSavingsEur: 0, electricityEquivalentKwh: 0 };

  audit?.debug(
    "financial",
    "financial.savings.computed",
    {
      canUseCarrierPricing,
      baselineCarrierBreakdown: baselineCarriers,
      scenarioCarrierBreakdown: packageCarriers,
      annualSavingsEur,
      electricityEquivalentKwh,
      gasTariffEurPerKwh,
      electricityReferencePriceEurPerKwh:
        FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      renovationCost: input.capex,
      fundingFinancingType: funding.financingType,
      effectiveCost,
      loanAmount,
      loanTerm,
      subsidyAmount,
      incentiveMode: funding.incentives.mode,
    },
    auditCtx,
  );

  const skipReason: AppraisalSkipReason | undefined =
    effectiveCost <= 0
      ? "fully-subsidized"
      : !canUseCarrierPricing
        ? "missing-carrier-breakdown"
        : electricityEquivalentKwh <= 0
          ? "non-positive-savings"
          : undefined;

  if (skipReason) {
    audit?.warn(
      "financial",
      "financial.risk.skipped",
      {
        reason: skipReason,
        annualSavingsEur,
        electricityEquivalentKwh,
        renovationCost: input.capex,
        subsidyAmount,
        effectiveCost,
      },
      auditCtx,
    );
    return {
      effectiveCapex: effectiveCost,
      electricityEquivalentKwh,
      appraisal: { kind: "skipped", reason: skipReason },
    };
  }

  const { schemes, schemeType } = buildSchemes({ loanAmount, loanTerm });
  const request = {
    capex: effectiveCost,
    annual_maintenance_cost: input.annualMaintenanceCost,
    annual_energy_savings: electricityEquivalentKwh,
    project_lifetime: input.projectLifetime,
    output_level: input.outputLevel,
    schemes,
  };
  audit?.debug("financial", "financial.risk.request", { request }, auditCtx);

  const mapped = mapWireRiskResponse(await financial.assessRisk(request), {
    schemeType,
    projectLifetime: input.projectLifetime,
    loanTerm,
  });

  return {
    effectiveCapex: effectiveCost,
    electricityEquivalentKwh,
    appraisal: {
      kind: "appraised",
      pointForecasts: mapped.pointForecasts,
      metadata: {
        n_sims: mapped.metadata.n_sims,
        project_lifetime: mapped.metadata.project_lifetime,
        capex: mapped.metadata.capex || effectiveCost,
        annual_maintenance_cost: input.annualMaintenanceCost,
        output_level: input.outputLevel,
        ...(mapped.cashFlowData ? { cash_flow_data: mapped.cashFlowData } : {}),
        ...(mapped.chartMetadata
          ? { chart_metadata: mapped.chartMetadata }
          : {}),
      },
      probabilities: mapped.probabilities,
      percentiles: mapped.percentiles,
      cashFlowData: mapped.cashFlowData,
    },
  };
}
