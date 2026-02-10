/**
 * Real Financial Service Implementation
 * Calls the Financial API endpoints for ARV and risk assessment.
 *
 * The output level is parameterized via constructor to support different tools:
 * - HRA (Home Renovation Assistant): uses "private" output level
 * - PRA (Portfolio Renovation Advisor): may use "professional" or higher
 *
 * Reference: api-specs/20260114-115138/financial.json
 */

import { financial } from "../api";
import type {
  ARVResult,
  BuildingInfo,
  CashFlowData,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  PercentileData,
  RenovationScenario,
  RiskAssessmentPercentiles,
  ScenarioId,
} from "../types/renovation";
import {
  fromAPIEnergyClass,
  toAPIEnergyClass,
  toAPIPropertyType,
  type APIEnergyClass,
  type OutputLevel,
} from "../utils/apiMappings";
import { applyFundingReduction } from "../utils/financialCalculations";
import type {
  ARVRequest,
  IFinancialService,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "./types";

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
      energy_class: request.energy_class,
      renovated_last_5_years: request.renovated_last_5_years ?? true,
    });

    return {
      pricePerSqm: response.price_per_sqm,
      totalPrice: response.total_price,
      floorArea: response.floor_area,
      energyClass: fromAPIEnergyClass(response.energy_class as APIEnergyClass),
      metadata: response.metadata,
    };
  }

  /**
   * Perform risk assessment via POST /risk-assessment
   */
  async assessRisk(
    request: RiskAssessmentRequest,
  ): Promise<RiskAssessmentResponse> {
    const response = await financial.assessRisk({
      annual_energy_savings: request.annual_energy_savings,
      project_lifetime: request.project_lifetime,
      output_level: this.outputLevel,
      indicators: request.indicators,
      loan_amount: request.loan_amount ?? 0,
      loan_term: request.loan_term ?? 0,
      capex: request.capex,
      annual_maintenance_cost: request.annual_maintenance_cost,
      include_visualizations: request.include_visualizations,
    });

    const rawMetadata = response.metadata ?? {};
    const cashFlowData = normalizeCashFlowData(
      (rawMetadata as Record<string, unknown>).cash_flow_data,
    );

    // Map percentiles if available (included in public+ output levels, or when API returns them)
    const percentiles = response.percentiles
      ? normalizePercentiles(response.percentiles)
      : undefined;

    return {
      pointForecasts: {
        NPV: response.point_forecasts.NPV ?? 0,
        IRR: response.point_forecasts.IRR ?? 0,
        ROI: response.point_forecasts.ROI ?? 0,
        PBP: response.point_forecasts.PBP ?? 0,
        DPP: response.point_forecasts.DPP ?? 0,
        MonthlyAvgSavings: response.point_forecasts.MonthlyAvgSavings ?? 0,
        SuccessRate: response.point_forecasts.SuccessRate ?? 0,
      },
      metadata: {
        ...rawMetadata,
        n_sims: response.metadata.n_sims as number | undefined,
        project_lifetime:
          (response.metadata.project_lifetime as number) ??
          request.project_lifetime,
        capex: (response.metadata.capex as number) ?? request.capex ?? 0,
        loan_amount:
          (response.metadata.loan_amount as number) ?? request.loan_amount ?? 0,
        annual_loan_payment: response.metadata.annual_loan_payment as
          | number
          | undefined,
        loan_rate_percent: response.metadata.loan_rate_percent as
          | number
          | undefined,
        output_level: this.outputLevel,
        ...(cashFlowData ? { cash_flow_data: cashFlowData } : {}),
      },
      percentiles,
      cashFlowVisualization: response.visualizations?.cash_flow_timeline,
      cashFlowData,
    };
  }

  /**
   * Calculate financial results for all scenarios
   * @param scenarios Array of renovation scenarios to evaluate
   * @param fundingOptions Funding/loan configuration
   * @param floorArea Building floor area in m²
   * @param currentEstimation Current building energy estimation
   * @param _financialScenario Economic scenario (baseline/optimistic/pessimistic)
   * @param totalCapex Total capital expenditure for renovation (EUR), or null to let API fetch from database
   * @param annualMaintenanceCost Annual O&M cost (EUR/year), or null to let API fetch from database
   * @param building Building information for ARV calculation
   */
  async calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    _financialScenario: FinancialScenario,
    totalCapex: number | null,
    annualMaintenanceCost: number | null,
    building: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    const results: Record<string, FinancialResults> = {};

    for (const scenario of scenarios) {
      if (scenario.id === "current") {
        // Current scenario: no renovation, just current ARV
        const arvRequest: ARVRequest = {
          lat: building.lat ?? 0,
          lng: building.lng ?? 0,
          floor_area: floorArea,
          construction_year: building.constructionYear ?? 1990,
          number_of_floors: building.numberOfFloors ?? 1,
          floor_number: building.floorNumber,
          property_type: toAPIPropertyType(building.buildingType),
          energy_class: toAPIEnergyClass(currentEstimation.estimatedEPC),
          renovated_last_5_years: false, // Current state, not recently renovated
        };
        const arvResult = await this.calculateARV(arvRequest);

        results[scenario.id] = {
          arv: arvResult,
          riskAssessment: null,
          capitalExpenditure: 0,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: arvResult.totalPrice,
        };
        continue;
      }

      // For renovated scenario, use the provided totalCapex if available
      // If totalCapex is null or 0, let the API fetch from its internal dataset
      const hasCapex = totalCapex !== null && totalCapex > 0;
      const renovationCost = hasCapex ? totalCapex : 0;

      // Apply funding options only if we have a CAPEX value
      const { effectiveCost, loanAmount } = hasCapex
        ? applyFundingReduction(renovationCost, fundingOptions)
        : { effectiveCost: undefined, loanAmount: 0 };

      // Calculate loan term based on financing type
      const loanTerm =
        fundingOptions.financingType === "loan"
          ? fundingOptions.loan.duration
          : 0;

      // ARV Request for renovated scenario
      const arvRequest: ARVRequest = {
        lat: building.lat ?? 0,
        lng: building.lng ?? 0,
        floor_area: floorArea,
        construction_year: building.constructionYear ?? 1990,
        number_of_floors: building.numberOfFloors ?? 1,
        floor_number: building.floorNumber,
        property_type: toAPIPropertyType(building.buildingType),
        energy_class: toAPIEnergyClass(scenario.epcClass),
        renovated_last_5_years: building.renovatedLast5Years,
      };

      // Risk assessment request
      // Note: capex and annual_maintenance_cost are optional
      // If undefined, API retrieves from internal dataset
      const hasMaintenanceCost =
        annualMaintenanceCost !== null && annualMaintenanceCost > 0;
      const annualEnergySavingsKWh = Math.max(
        0,
        currentEstimation.annualEnergyNeeds - (scenario.annualEnergyNeeds ?? 0),
      ); // values are already in kWh/year

      const riskRequest: RiskAssessmentRequest = {
        annual_energy_savings: Math.round(annualEnergySavingsKWh),
        project_lifetime: building.projectLifetime,
        output_level: this.outputLevel,
        capex: effectiveCost, // undefined if no CAPEX provided, API will fetch from DB
        annual_maintenance_cost: hasMaintenanceCost
          ? annualMaintenanceCost
          : undefined,
        loan_amount: loanAmount,
        loan_term: loanTerm,
      };

      // Call APIs in parallel
      const [arvResult, riskResult] = await Promise.all([
        this.calculateARV(arvRequest),
        this.assessRisk(riskRequest),
      ]);

      results[scenario.id] = {
        arv: arvResult,
        riskAssessment: riskResult,
        capitalExpenditure: Math.round(riskResult.metadata.capex), // Use CAPEX from API response
        returnOnInvestment: riskResult.pointForecasts.ROI,
        paybackTime: riskResult.pointForecasts.PBP,
        netPresentValue: riskResult.pointForecasts.NPV,
        afterRenovationValue: arvResult.totalPrice,
        // NOTE: npvRange and paybackTimeRange removed - use actual percentiles from API instead
      };
    }

    return results as Record<ScenarioId, FinancialResults>;
  }
}

function normalizeCashFlowData(raw: unknown): CashFlowData | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.years)) {
    return undefined;
  }

  const years = (data.years as unknown[]).map((y) => Number(y));
  const inflows = Array.isArray(data.annual_inflows)
    ? (data.annual_inflows as unknown[]).map((v) => Number(v))
    : [];
  const outflows = Array.isArray(data.annual_outflows)
    ? (data.annual_outflows as unknown[]).map((v) => Number(v))
    : [];
  const net = Array.isArray(data.annual_net_cash_flow)
    ? (data.annual_net_cash_flow as unknown[]).map((v) => Number(v))
    : years.map((_, idx) => (inflows[idx] ?? 0) - (outflows[idx] ?? 0));

  const cumulative = Array.isArray(data.cumulative_cash_flow)
    ? (data.cumulative_cash_flow as unknown[]).map((v) => Number(v))
    : net.reduce<number[]>((acc, value, idx) => {
        const prev = idx === 0 ? 0 : acc[idx - 1];
        acc.push(prev + value);
        return acc;
      }, []);

  return {
    years,
    initial_investment:
      typeof data.initial_investment === "number"
        ? data.initial_investment
        : undefined,
    annual_inflows: inflows,
    annual_outflows: outflows,
    annual_net_cash_flow: net,
    cumulative_cash_flow: cumulative,
    breakeven_year:
      typeof data.breakeven_year === "number" || data.breakeven_year === null
        ? (data.breakeven_year as number | null)
        : undefined,
    loan_term:
      typeof data.loan_term === "number" || data.loan_term === null
        ? (data.loan_term as number | null)
        : undefined,
  };
}

/**
 * Normalize percentile data from API response to internal type.
 * API returns: { NPV: { P10: x, P20: y, ... }, PBP: { ... }, ... }
 */
function normalizePercentiles(
  raw: Record<string, Record<string, number>> | null | undefined,
): RiskAssessmentPercentiles | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const normalizeIndicator = (
    data: Record<string, number> | undefined,
  ): PercentileData | undefined => {
    if (!data || typeof data !== "object") return undefined;
    // Ensure at minimum P10, P50, P90 are present
    if (
      data.P10 === undefined ||
      data.P50 === undefined ||
      data.P90 === undefined
    ) {
      return undefined;
    }
    return {
      P10: data.P10,
      P20: data.P20,
      P30: data.P30,
      P40: data.P40,
      P50: data.P50,
      P60: data.P60,
      P70: data.P70,
      P80: data.P80,
      P90: data.P90,
    };
  };

  const result: RiskAssessmentPercentiles = {};

  if (raw.NPV) result.NPV = normalizeIndicator(raw.NPV);
  if (raw.PBP) result.PBP = normalizeIndicator(raw.PBP);
  if (raw.ROI) result.ROI = normalizeIndicator(raw.ROI);
  if (raw.IRR) result.IRR = normalizeIndicator(raw.IRR);
  if (raw.DPP) result.DPP = normalizeIndicator(raw.DPP);

  // Return undefined if no valid percentile data was found
  const hasAnyData = Object.values(result).some((v) => v !== undefined);
  return hasAnyData ? result : undefined;
}
