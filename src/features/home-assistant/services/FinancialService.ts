/**
 * Real Financial Service Implementation
 * Calls the Financial API endpoints for ARV and risk assessment.
 *
 * Reference: api-specs/20260114-115138/financial.json
 */

import { financial } from "../../../api";
import type {
  ARVResult,
  BuildingInfo,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  RenovationScenario,
  ScenarioId,
} from "../context/types";
import {
  applyFundingReduction,
  fromAPIEnergyClass,
  HRA_OUTPUT_LEVEL,
  toAPIEnergyClass,
  toAPIPropertyType,
  type APIEnergyClass,
} from "../utils";
import type {
  ARVRequest,
  IFinancialService,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "./types";

export class FinancialService implements IFinancialService {
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
      output_level: HRA_OUTPUT_LEVEL,
      indicators: request.indicators,
      loan_amount: request.loan_amount ?? 0,
      loan_term: request.loan_term ?? 0,
      capex: request.capex,
      annual_maintenance_cost: request.annual_maintenance_cost,
      include_visualizations: request.include_visualizations,
    });

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
        n_sims: (response.metadata.n_sims as number) ?? 10000,
        project_lifetime:
          (response.metadata.project_lifetime as number) ??
          request.project_lifetime,
        capex: (response.metadata.capex as number) ?? request.capex ?? 0,
        loan_amount:
          (response.metadata.loan_amount as number) ?? request.loan_amount ?? 0,
        output_level: HRA_OUTPUT_LEVEL,
      },
      cashFlowVisualization: response.visualizations?.cash_flow_timeline,
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
      const riskRequest: RiskAssessmentRequest = {
        annual_energy_savings:
          (currentEstimation.annualEnergyNeeds - scenario.annualEnergyNeeds) *
          1000, // Convert MWh to kWh
        project_lifetime: building.projectLifetime,
        output_level: HRA_OUTPUT_LEVEL,
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
        npvRange: {
          min: Math.round(riskResult.pointForecasts.NPV * 0.8),
          max: Math.round(riskResult.pointForecasts.NPV * 1.2),
        },
        paybackTimeRange: {
          min: Math.round(riskResult.pointForecasts.PBP * 0.8 * 10) / 10,
          max: Math.round(riskResult.pointForecasts.PBP * 1.2 * 10) / 10,
        },
      };
    }

    return results as Record<ScenarioId, FinancialResults>;
  }
}
