/**
 * Real Financial Service Implementation
 * Calls the Financial API endpoints for ARV and risk assessment.
 *
 * The output level is parameterized via constructor to support different tools:
 * - HRA (Home Renovation Assistant): uses "private" output level
 * - PRA (Portfolio Renovation Advisor): may use "professional" or higher
 *
 * Align with relife-financial-service (verify in repo).
 */

import { financial } from "../api";
import type {
  ARVResult,
  BuildingInfo,
  FinancialResults,
  ScenarioId,
} from "../types/renovation";
import {
  deriveConstructionYear,
  fromAPIEnergyClass,
  toAPIPropertyType,
  type APIEnergyClass,
  type OutputLevel,
} from "../utils/apiMappings";
import { applyFundingReduction } from "../utils/financialCalculations";
import { APIError } from "../types/common";
import { buildSchemes, mapWireRiskResponse } from "./riskAssessmentAdapter";
import type { RiskAssessmentRequest as RiskAssessmentWireRequest } from "../types/financial";
import type {
  ARVRequest,
  CalculateFinancialScenariosRequest,
  EstimatePackageCostsRequest,
  EstimatePackageCostsResult,
  FinancialAssumptions,
  IFinancialService,
  RiskAssessmentServiceRequest,
  RiskAssessmentServiceResponse,
} from "./types";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import {
  computeCarrierFinancialEnergySavings,
  ENERGY_TARIFF_DEFAULTS,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "./carrierSavingsService";
import { resolveEpcRatingIntensity } from "./energyUtils";

/**
 * The CAPEX/OPEX lookup lives inside the risk-assessment endpoint, which still
 * requires a positive `annual_energy_savings`. The estimation pre-pass only
 * reads back the resolved costs from `metadata`, so the simulation inputs below
 * are inert placeholders whose Monte Carlo output is discarded.
 */
const ESTIMATION_PLACEHOLDER_ANNUAL_ENERGY_SAVINGS_KWH = 1;
const ESTIMATION_DEFAULT_PROJECT_LIFETIME_YEARS = 20;

function resolveConstructionYear(building: BuildingInfo): number {
  return (
    building.constructionYear ??
    deriveConstructionYear(building.constructionPeriod)
  );
}

/**
 * Energy intensity (kWh/m²/year) sent to the ARV model as `energy_consumption_*`.
 *
 * The ARV model resolves a national EPC class from this value, so it must use
 * the same basis as the displayed EPC badge (primary energy, falling back to
 * delivered then thermal demand) — otherwise the property-value story and the
 * EPC badge can contradict each other.
 */
function resolveArvEnergyIntensity(
  source: {
    primaryEnergy?: number;
    deliveredTotal?: number;
    annualEnergyNeeds: number;
  },
  floorArea: number,
): number {
  return resolveEpcRatingIntensity(source, floorArea).intensity;
}

function resolveFinancialAssumptions(
  partial?: FinancialAssumptions,
): Required<FinancialAssumptions> {
  return {
    gasTariffEurPerKwh:
      partial?.gasTariffEurPerKwh ?? ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
  };
}

export class FinancialService implements IFinancialService {
  private readonly outputLevel: OutputLevel;

  constructor(outputLevel: OutputLevel = "private") {
    this.outputLevel = outputLevel;
  }

  /**
   * Calculate After Renovation Value (ARV) via POST /arv
   */
  async calculateARV(request: ARVRequest): Promise<ARVResult> {
    const response = await financial.calculateARV({
      lat: request.lat,
      lng: request.lng,
      floor_area: request.floor_area,
      construction_year: request.construction_year,
      floor_number: request.floor_number,
      number_of_floors: request.number_of_floors,
      property_type: request.property_type,
      target_country: request.target_country,
      energy_consumption_before: request.energy_consumption_before,
      energy_consumption_after: request.energy_consumption_after,
      renovated_last_5_years: request.renovated_last_5_years ?? true,
    });

    return {
      pricePerSqm: response.after.price_per_sqm,
      totalPrice: response.after.total_price,
      floorArea: response.floor_area,
      energyClass: fromAPIEnergyClass(
        response.after.greek_epc_class as APIEnergyClass,
      ),
      metadata: {
        ...response.metadata,
        before: response.before,
        uplift: response.uplift,
        epcResolution: response.after.epc_resolution,
      },
    };
  }

  /**
   * Best-effort ARV: ARV is a standalone, non-critical metric (not an input to
   * NPV/IRR/ROI/payback). Some countries are not supported by the ARV model
   * (e.g. Poland → 400), so a failure here must not abort the financial run.
   * Returns null and records a warn instead of throwing.
   */
  private async tryCalculateARV(
    request: ARVRequest,
    auditCtx?: AuditCtx,
  ): Promise<ARVResult | null> {
    try {
      return await this.calculateARV(request);
    } catch (error) {
      auditLog.warn(
        "financial",
        "financial.arv.skipped",
        {
          targetCountry: request.target_country,
          reason: error instanceof APIError ? `api-${error.status}` : "error",
          message: error instanceof Error ? error.message : String(error),
        },
        auditCtx,
      );
      return null;
    }
  }

  /**
   * Perform risk assessment via POST /risk-assessment.
   *
   * Builds the single financing scheme from the resolved loan inputs (equity
   * or bank_loan) and maps the per-scheme wire response back into the internal
   * shape via the shared adapter. The upfront incentive is already folded into
   * `request.capex` by `applyFundingReduction`.
   */
  async assessRisk(
    request: RiskAssessmentServiceRequest,
  ): Promise<RiskAssessmentServiceResponse> {
    const { schemes, schemeType } = buildSchemes({
      loanAmount: request.loan_amount ?? 0,
      loanTerm: request.loan_term ?? 0,
    });

    const wire = await financial.assessRisk({
      capex: request.capex ?? 0,
      annual_energy_savings: request.annual_energy_savings,
      annual_maintenance_cost: request.annual_maintenance_cost,
      project_lifetime: request.project_lifetime,
      output_level: this.outputLevel,
      indicators: request.indicators,
      schemes,
    });

    const mapped = mapWireRiskResponse(wire, {
      schemeType,
      projectLifetime: request.project_lifetime,
    });

    return {
      pointForecasts: mapped.pointForecasts,
      metadata: {
        n_sims: mapped.metadata.n_sims,
        project_lifetime: mapped.metadata.project_lifetime,
        capex: mapped.metadata.capex || (request.capex ?? 0),
        annual_maintenance_cost: request.annual_maintenance_cost,
        output_level: this.outputLevel,
        ...(mapped.cashFlowData ? { cash_flow_data: mapped.cashFlowData } : {}),
        ...(mapped.chartMetadata
          ? { chart_metadata: mapped.chartMetadata }
          : {}),
      },
      probabilities: mapped.probabilities,
      percentiles: mapped.percentiles,
      cashFlowData: mapped.cashFlowData,
    };
  }

  /**
   * Estimate a package's CAPEX/OPEX from EU reference data via the Financial
   * lookup. Calls /risk-assessment with the cost fields omitted (the server then
   * resolves them from `country` + `renovation_actions`) and reads the resolved
   * values back from `metadata`. The Monte Carlo result is discarded — this is
   * purely a cost estimation pre-pass.
   */
  async estimatePackageCosts(
    request: EstimatePackageCostsRequest,
  ): Promise<EstimatePackageCostsResult> {
    const { schemes } = buildSchemes({ loanAmount: 0, loanTerm: 0 });

    // Built against the wire contract (capex/annual_maintenance_cost omitted so
    // the backend resolves them from country + renovation_actions).
    const wireRequest: RiskAssessmentWireRequest = {
      annual_energy_savings: ESTIMATION_PLACEHOLDER_ANNUAL_ENERGY_SAVINGS_KWH,
      project_lifetime:
        request.projectLifetime ?? ESTIMATION_DEFAULT_PROJECT_LIFETIME_YEARS,
      output_level: this.outputLevel,
      schemes,
      country: request.country,
      renovation_actions: request.renovationActions,
    };

    // Background pre-pass: suppress the global loading overlay (the renovation
    // step shows a quiet per-card loader instead).
    const wire = await financial.assessRisk(wireRequest, {
      skipGlobalLoading: true,
    });

    const { metadata } = wire;
    // A resolved CAPEX is mandatory; treat a missing/non-positive value as a
    // lookup failure so the caller can surface it rather than silently showing
    // €0. OPEX of 0 is legitimate (insulation/windows carry no annual O&M).
    if (metadata.capex == null || metadata.capex <= 0) {
      throw new Error(
        "Reference-data lookup did not return a cost for this package.",
      );
    }
    return {
      capex: metadata.capex,
      annualMaintenanceCost: metadata.annual_maintenance_cost ?? 0,
      capexFromLookup: metadata.capex_from_lookup ?? false,
      opexFromLookup: metadata.opex_from_lookup ?? false,
    };
  }

  /**
   * Calculate financial results for all scenarios
   */
  async calculateForAllScenarios(
    request: CalculateFinancialScenariosRequest,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    const {
      scenarios,
      fundingOptions: resolvedFundingOptions,
      floorArea: resolvedFloorArea,
      currentEstimation: resolvedCurrentEstimation,
      packageFinancialInputs: resolvedPackageFinancialInputs,
      building: resolvedBuilding,
      financialAssumptions: resolvedFinancialAssumptions,
      auditCtx: parentAuditCtx,
    } = request;
    const results: Record<string, FinancialResults> = {};
    const assumptions = resolveFinancialAssumptions(
      resolvedFinancialAssumptions,
    );

    auditLog.info(
      "financial",
      "financial.run.start",
      {
        outputLevel: this.outputLevel,
        scenarioIds: scenarios.map((s) => s.id),
        floorArea: resolvedFloorArea,
        projectLifetime: resolvedBuilding.projectLifetime,
        financingType: resolvedFundingOptions.financingType,
        gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
        electricityReferencePriceEurPerKwh:
          FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      },
      parentAuditCtx,
    );

    const baselineEnergyIntensity = resolveArvEnergyIntensity(
      {
        primaryEnergy: resolvedCurrentEstimation.primaryEnergy,
        deliveredTotal: resolvedCurrentEstimation.deliveredTotal,
        annualEnergyNeeds: resolvedCurrentEstimation.annualEnergyNeeds,
      },
      resolvedFloorArea,
    );

    for (const scenario of scenarios) {
      const auditCtx = parentAuditCtx?.child({ scenarioId: scenario.id });
      auditLog.info(
        "financial",
        "financial.scenario.start",
        {
          scenarioId: scenario.id,
          scenarioEPC: scenario.epcClass,
          measureIds: scenario.measureIds,
        },
        auditCtx,
      );
      if (scenario.id === "current") {
        // Current scenario: no renovation, just current ARV
        const arvRequest: ARVRequest = {
          lat: resolvedBuilding.lat ?? 0,
          lng: resolvedBuilding.lng ?? 0,
          floor_area: resolvedFloorArea,
          construction_year: resolveConstructionYear(resolvedBuilding),
          number_of_floors: resolvedBuilding.numberOfFloors ?? 1,
          floor_number: resolvedBuilding.floorNumber,
          property_type: toAPIPropertyType(resolvedBuilding.buildingType),
          target_country: resolvedBuilding.country,
          energy_consumption_after: baselineEnergyIntensity,
          renovated_last_5_years: false, // Current state, not recently renovated
        };
        auditLog.debug(
          "financial",
          "financial.arv.request",
          { request: arvRequest as unknown as Record<string, unknown> },
          auditCtx,
        );
        const arvResult = await this.tryCalculateARV(arvRequest, auditCtx);

        results[scenario.id] = {
          arv: arvResult,
          riskAssessment: null,
          capitalExpenditure: 0,
          annualMaintenanceCost: 0,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: arvResult?.totalPrice ?? null,
        };
        auditLog.info(
          "financial",
          "financial.scenario.end",
          {
            scenarioId: scenario.id,
            kind: "current",
            afterRenovationValue: arvResult?.totalPrice ?? null,
            arvPricePerSqm: arvResult?.pricePerSqm,
            arvEnergyClass: arvResult?.energyClass,
          },
          auditCtx,
        );
        continue;
      }

      const packageInput = resolvedPackageFinancialInputs[scenario.id];
      if (
        !packageInput ||
        packageInput.capex === null ||
        packageInput.capex <= 0
      ) {
        throw new Error(`Missing CAPEX for scenario ${scenario.id}`);
      }
      if (
        packageInput.annualMaintenanceCost === null ||
        packageInput.annualMaintenanceCost < 0
      ) {
        throw new Error(
          `Missing annual maintenance cost for scenario ${scenario.id}`,
        );
      }

      const renovationCost = packageInput.capex;
      const annualMaintenanceCost = packageInput.annualMaintenanceCost;
      const { effectiveCost, loanAmount } = applyFundingReduction(
        renovationCost,
        resolvedFundingOptions,
      );

      // Calculate loan term based on financing type
      const loanTerm =
        resolvedFundingOptions.financingType === "loan"
          ? resolvedFundingOptions.loan.duration
          : 0;

      // ARV Request for renovated scenario
      const arvRequest: ARVRequest = {
        lat: resolvedBuilding.lat ?? 0,
        lng: resolvedBuilding.lng ?? 0,
        floor_area: resolvedFloorArea,
        construction_year: resolveConstructionYear(resolvedBuilding),
        number_of_floors: resolvedBuilding.numberOfFloors ?? 1,
        floor_number: resolvedBuilding.floorNumber,
        property_type: toAPIPropertyType(resolvedBuilding.buildingType),
        target_country: resolvedBuilding.country,
        energy_consumption_before: baselineEnergyIntensity,
        energy_consumption_after: resolveArvEnergyIntensity(
          {
            primaryEnergy: scenario.primaryEnergy,
            deliveredTotal: scenario.deliveredTotal,
            annualEnergyNeeds: scenario.annualEnergyNeeds,
          },
          resolvedFloorArea,
        ),
        renovated_last_5_years: resolvedBuilding.renovatedLast5Years,
      };

      // Current Financial API accepts one scalar kWh value and prices it with
      // the electricity curve. Preserve carrier economics by first valuing gas
      // and grid-electricity deltas separately, then converting the net EUR
      // savings into electricity-equivalent kWh at the backend reference price.
      const canUseCarrierPricing =
        resolvedCurrentEstimation.carrierBreakdown !== undefined &&
        scenario.carrierBreakdown !== undefined;
      const carrierSavings = canUseCarrierPricing
        ? computeCarrierFinancialEnergySavings(
            resolvedCurrentEstimation.carrierBreakdown!,
            scenario.carrierBreakdown!,
            {
              gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
              electricityReferencePriceEurPerKwh:
                FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
            },
          )
        : { annualSavingsEur: 0, electricityEquivalentKwh: 0 };

      auditLog.debug(
        "financial",
        "financial.savings.computed",
        {
          canUseCarrierPricing,
          baselineCarrierBreakdown: resolvedCurrentEstimation.carrierBreakdown,
          scenarioCarrierBreakdown: scenario.carrierBreakdown,
          baselineDeliveredTotal: resolvedCurrentEstimation.deliveredTotal,
          scenarioDeliveredTotal: scenario.deliveredTotal,
          annualSavingsEur: carrierSavings.annualSavingsEur,
          electricityEquivalentKwh: carrierSavings.electricityEquivalentKwh,
          gasTariffEurPerKwh: assumptions.gasTariffEurPerKwh,
          electricityReferencePriceEurPerKwh:
            FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
          renovationCost,
          fundingFinancingType: resolvedFundingOptions.financingType,
          effectiveCost,
          loanAmount,
          loanTerm,
          upfrontIncentivePercentage:
            resolvedFundingOptions.incentives.upfrontPercentage,
        },
        auditCtx,
      );

      const riskRequest: RiskAssessmentServiceRequest = {
        annual_energy_savings: carrierSavings.electricityEquivalentKwh,
        project_lifetime: resolvedBuilding.projectLifetime,
        output_level: this.outputLevel,
        capex: effectiveCost,
        annual_maintenance_cost: annualMaintenanceCost,
        loan_amount: loanAmount,
        loan_term: loanTerm,
      };

      // The risk-assessment endpoint requires annual_energy_savings > 0.
      // If the renovation produces no measurable savings, skip that call.
      const hasSavings = riskRequest.annual_energy_savings > 0;

      auditLog.debug(
        "financial",
        "financial.arv.request",
        { request: arvRequest as unknown as Record<string, unknown> },
        auditCtx,
      );
      if (hasSavings) {
        auditLog.debug(
          "financial",
          "financial.risk.request",
          {
            request: riskRequest as unknown as Record<string, unknown>,
          },
          auditCtx,
        );
      } else {
        auditLog.warn(
          "financial",
          "financial.risk.skipped",
          {
            scenarioId: scenario.id,
            reason: canUseCarrierPricing
              ? "non-positive-carrier-aware-savings"
              : "missing-carrier-breakdown",
            annualSavingsEur: carrierSavings.annualSavingsEur,
            electricityEquivalentKwh: carrierSavings.electricityEquivalentKwh,
          },
          auditCtx,
        );
      }

      // Call APIs in parallel (risk assessment only when savings > 0)
      const [arvResult, riskResult] = await Promise.all([
        this.tryCalculateARV(arvRequest, auditCtx),
        hasSavings ? this.assessRisk(riskRequest) : Promise.resolve(null),
      ]);

      const scenarioResults: FinancialResults = {
        arv: arvResult,
        riskAssessment: riskResult,
        capitalExpenditure: riskResult
          ? Math.round(riskResult.metadata.capex)
          : Math.round(effectiveCost),
        annualMaintenanceCost:
          riskResult?.metadata.annual_maintenance_cost ?? annualMaintenanceCost,
        returnOnInvestment: riskResult?.pointForecasts.ROI ?? 0,
        paybackTime: riskResult?.pointForecasts.PBP ?? 0,
        netPresentValue: riskResult?.pointForecasts.NPV ?? 0,
        afterRenovationValue: arvResult?.totalPrice ?? null,
        // NOTE: npvRange and paybackTimeRange removed - use actual percentiles from API instead
      };
      results[scenario.id] = scenarioResults;

      auditLog.info(
        "financial",
        "financial.scenario.end",
        {
          scenarioId: scenario.id,
          capitalExpenditure: scenarioResults.capitalExpenditure,
          annualMaintenanceCost: scenarioResults.annualMaintenanceCost,
          netPresentValue: scenarioResults.netPresentValue,
          returnOnInvestment: scenarioResults.returnOnInvestment,
          paybackTime: scenarioResults.paybackTime,
          afterRenovationValue: scenarioResults.afterRenovationValue,
          arvEnergyClass: arvResult?.energyClass,
          riskComputed: riskResult !== null,
          cashFlowTimeline: riskResult?.cashFlowData !== undefined,
          probabilityKeys: riskResult?.probabilities
            ? Object.keys(riskResult.probabilities)
            : undefined,
        },
        auditCtx,
      );
    }

    auditLog.info(
      "financial",
      "financial.run.end",
      {
        scenarioIds: scenarios.map((s) => s.id),
      },
      parentAuditCtx,
    );

    return results as Record<ScenarioId, FinancialResults>;
  }
}
