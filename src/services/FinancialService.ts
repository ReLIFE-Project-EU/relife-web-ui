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
  EstimationResult,
  FinancialResults,
  FundingOptions,
  PackageFinancialInputsById,
  RenovationScenario,
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
import { buildSchemes, mapWireRiskResponse } from "./riskAssessmentAdapter";
import type {
  ARVRequest,
  CalculateFinancialScenariosRequest,
  IFinancialService,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "./types";
import { auditLog, type AuditCtx } from "../utils/auditLogger";

const USE_SIMULATED_DELIVERED_ENERGY_FOR_FINANCE = true;

function resolveConstructionYear(building: BuildingInfo): number {
  return (
    building.constructionYear ??
    deriveConstructionYear(building.constructionPeriod)
  );
}

function resolveArvEnergyIntensity(
  annualEnergyTotal: number | undefined,
  fallbackAnnualEnergyNeeds: number,
  floorArea: number,
): number {
  return (annualEnergyTotal ?? fallbackAnnualEnergyNeeds) / floorArea;
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
   * Perform risk assessment via POST /risk-assessment.
   *
   * Builds the single financing scheme from the resolved loan inputs (equity
   * or bank_loan) and maps the per-scheme wire response back into the internal
   * shape via the shared adapter. The upfront incentive is already folded into
   * `request.capex` by `applyFundingReduction`.
   */
  async assessRisk(
    request: RiskAssessmentRequest,
  ): Promise<RiskAssessmentResponse> {
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
   * Calculate financial results for all scenarios
   */
  async calculateForAllScenarios(
    request: CalculateFinancialScenariosRequest,
  ): Promise<Record<ScenarioId, FinancialResults>>;
  async calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    packageFinancialInputs: PackageFinancialInputsById,
    building: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>>;
  async calculateForAllScenarios(
    requestOrScenarios:
      | CalculateFinancialScenariosRequest
      | RenovationScenario[],
    fundingOptions?: FundingOptions,
    floorArea?: number,
    currentEstimation?: EstimationResult,
    packageFinancialInputs?: PackageFinancialInputsById,
    building?: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    const {
      scenarios,
      fundingOptions: resolvedFundingOptions,
      floorArea: resolvedFloorArea,
      currentEstimation: resolvedCurrentEstimation,
      packageFinancialInputs: resolvedPackageFinancialInputs,
      building: resolvedBuilding,
      auditCtx: parentAuditCtx,
    } = Array.isArray(requestOrScenarios)
      ? {
          scenarios: requestOrScenarios,
          fundingOptions: fundingOptions!,
          floorArea: floorArea!,
          currentEstimation: currentEstimation!,
          packageFinancialInputs: packageFinancialInputs!,
          building: building!,
          auditCtx: undefined as AuditCtx | undefined,
        }
      : requestOrScenarios;
    const results: Record<string, FinancialResults> = {};

    auditLog.info(
      "financial",
      "financial.run.start",
      {
        outputLevel: this.outputLevel,
        scenarioIds: scenarios.map((s) => s.id),
        floorArea: resolvedFloorArea,
        projectLifetime: resolvedBuilding.projectLifetime,
        financingType: resolvedFundingOptions.financingType,
      },
      parentAuditCtx,
    );

    const baselineEnergyIntensity = resolveArvEnergyIntensity(
      resolvedCurrentEstimation.deliveredTotal,
      resolvedCurrentEstimation.annualEnergyNeeds,
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
        const arvResult = await this.calculateARV(arvRequest);

        results[scenario.id] = {
          arv: arvResult,
          riskAssessment: null,
          capitalExpenditure: 0,
          annualMaintenanceCost: 0,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: arvResult.totalPrice,
        };
        auditLog.info(
          "financial",
          "financial.scenario.end",
          {
            scenarioId: scenario.id,
            kind: "current",
            afterRenovationValue: arvResult.totalPrice,
            arvPricePerSqm: arvResult.pricePerSqm,
            arvEnergyClass: arvResult.energyClass,
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
          scenario.deliveredTotal,
          scenario.annualEnergyNeeds,
          resolvedFloorArea,
        ),
        renovated_last_5_years: resolvedBuilding.renovatedLast5Years,
      };

      // Canonical HRA semantic for POST /financial/risk-assessment:
      // annual_energy_savings = max(0, baseline deliveredTotal - scenario deliveredTotal)
      //
      // This is saved HVAC system energy in kWh/year from Forecasting/UNI,
      // already scaled to the user's floor area. It is intentionally NOT:
      // - thermal-needs savings (Q_H/Q_C)
      // - a direct EUR saving
      //
      // System measures such as condensing boiler or heat pump can therefore
      // produce financial savings even when the building's thermal needs stay
      // broadly unchanged, because the HVAC system delivers the same comfort
      // with less input energy. If the required UNI totals are missing for a
      // scenario, skip the detailed risk/cash-flow path instead of silently
      // falling back to a different savings semantic.
      const canUseDeliveredEnergy =
        USE_SIMULATED_DELIVERED_ENERGY_FOR_FINANCE &&
        resolvedCurrentEstimation.deliveredTotal !== undefined &&
        scenario.deliveredTotal !== undefined;
      const annualEnergySavingsKWh = canUseDeliveredEnergy
        ? Math.max(
            0,
            resolvedCurrentEstimation.deliveredTotal! -
              scenario.deliveredTotal!,
          )
        : 0;

      auditLog.debug(
        "financial",
        "financial.savings.computed",
        {
          canUseDeliveredEnergy,
          baselineDeliveredTotal: resolvedCurrentEstimation.deliveredTotal,
          scenarioDeliveredTotal: scenario.deliveredTotal,
          annualEnergySavingsKWh,
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

      const riskRequest: RiskAssessmentRequest = {
        annual_energy_savings: Math.round(annualEnergySavingsKWh),
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
            reason: "zero-or-negative-savings",
            annualEnergySavingsKWh,
          },
          auditCtx,
        );
      }

      // Call APIs in parallel (risk assessment only when savings > 0)
      const [arvResult, riskResult] = await Promise.all([
        this.calculateARV(arvRequest),
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
        afterRenovationValue: arvResult.totalPrice,
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
          arvEnergyClass: arvResult.energyClass,
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
