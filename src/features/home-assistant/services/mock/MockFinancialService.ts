/**
 * Mock Financial Service
 * Provides financial indicator calculations matching the Financial API spec.
 *
 * TBD INTEGRATION NOTES
 * =====================
 * When integrating with the real Financial API:
 * - [ ] Replace calculateARV() with POST /arv call
 * - [ ] Replace assessRisk() with POST /risk-assessment call
 * - [ ] Handle API authentication (HTTPBearer)
 * - [ ] Map error responses appropriately
 *
 * Reference: api-specs/20260108-125427/financial.json
 */

import type {
  ARVResult,
  BuildingInfo,
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  PackageId,
  RenovationScenario,
  RiskAssessmentMetadata,
  RiskAssessmentPointForecasts,
  ScenarioId,
} from "../../context/types";
import {
  fromAPIEnergyClass,
  HRA_OUTPUT_LEVEL,
  toAPIEnergyClass,
  toAPIPropertyType,
  calculateNPV,
  calculateIRR,
  calculateSimplePayback,
  calculateDiscountedPayback,
  calculateROI,
  applyFundingReduction,
  type APIEnergyClass,
} from "../../utils";
import type {
  ARVRequest,
  IFinancialService,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "../types";

import {
  MOCK_AGE_DEPRECIATION_FACTOR,
  MOCK_BASE_PROPERTY_VALUE_PER_SQM,
  MOCK_CAPEX_SAVINGS_MULTIPLIER,
  MOCK_DEFAULT_LOAN_RATE,
  MOCK_DEFAULT_LAT,
  MOCK_DEFAULT_LNG,
  MOCK_DEFAULT_PROJECT_LIFETIME,
  MOCK_DELAY_SHORT,
  MOCK_DELAY_MEDIUM,
  MOCK_DISCOUNT_RATE,
  MOCK_ENERGY_PRICE_EUR_PER_KWH,
  MOCK_MIN_AGE_FACTOR,
  MOCK_N_SIMS,
  MOCK_RANGE_NPV_MAX,
  MOCK_RANGE_NPV_MIN,
  MOCK_RANGE_PAYBACK_MAX,
  MOCK_RANGE_PAYBACK_MIN,
  MOCK_RENOVATION_VALUE_MULTIPLIER,
  MOCK_SUCCESS_BASE_HIGH,
  MOCK_SUCCESS_BASE_LOW,
  MOCK_SUCCESS_RANDOM_HIGH,
  MOCK_SUCCESS_RANDOM_LOW,
  MOCK_SCENARIO_MULTIPLIERS,
  MOCK_EPC_VALUE_IMPACT,
} from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialCalculationInput {
  renovationCost: number;
  annualEnergySavings: number;
  fundingOptions: FundingOptions;
  scenario: FinancialScenario;
  floorArea: number;
  targetEPC: string;
}

export class MockFinancialService implements IFinancialService {
  /**
   * Calculate After Renovation Value (ARV)
   * TBD: Replace with POST /arv API call
   */
  async calculateARV(request: ARVRequest): Promise<ARVResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_SHORT));

    // TBD: Real API uses trained LightGBM model on Greek property data
    // Mock implementation uses simplified calculation
    const epcFactor = 1 + (MOCK_EPC_VALUE_IMPACT[request.energy_class] || 0);

    // Location factor (simplified - real API uses lat/lng with ML model)
    // TBD: Implement proper location-based pricing
    const locationFactor = 1.0;

    // Age factor
    const currentYear = new Date().getFullYear();
    const buildingAge = currentYear - request.construction_year;
    const ageFactor = Math.max(
      MOCK_MIN_AGE_FACTOR,
      1 - buildingAge * MOCK_AGE_DEPRECIATION_FACTOR,
    );

    // Renovation factor
    const renovationFactor = request.renovated_last_5_years
      ? MOCK_RENOVATION_VALUE_MULTIPLIER
      : 1.0;

    const pricePerSqm =
      MOCK_BASE_PROPERTY_VALUE_PER_SQM *
      epcFactor *
      locationFactor *
      ageFactor *
      renovationFactor;
    const totalPrice = pricePerSqm * request.floor_area;

    return {
      pricePerSqm: Math.round(pricePerSqm * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      floorArea: request.floor_area,
      energyClass: fromAPIEnergyClass(request.energy_class as APIEnergyClass),
      metadata: {
        model_version: "mock-v1",
        building_age: buildingAge,
        prediction_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Perform risk assessment with Monte Carlo simulation
   * TBD: Replace with POST /risk-assessment API call
   */
  async assessRisk(
    request: RiskAssessmentRequest,
  ): Promise<RiskAssessmentResponse> {
    // Simulate API delay (real API takes 2-5 seconds for Monte Carlo)
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MEDIUM));

    const {
      annual_energy_savings,
      project_lifetime,
      loan_amount = 0,
      loan_term = 0,
    } = request;

    // TBD: Real API retrieves capex from internal dataset if not provided
    // Mock uses a default based on energy savings
    const capex =
      request.capex ?? annual_energy_savings * MOCK_CAPEX_SAVINGS_MULTIPLIER;

    // Convert energy savings to EUR
    const annualSavingsEUR =
      annual_energy_savings * MOCK_ENERGY_PRICE_EUR_PER_KWH;

    // Calculate loan payment if applicable
    const loanRate = MOCK_DEFAULT_LOAN_RATE;
    let annualLoanPayment = 0;
    if (loan_amount > 0 && loan_term > 0) {
      // Simple amortization
      annualLoanPayment =
        (loan_amount * (loanRate * Math.pow(1 + loanRate, loan_term))) /
        (Math.pow(1 + loanRate, loan_term) - 1);
    }

    // Net annual savings after loan payment
    const netAnnualSavings = annualSavingsEUR - annualLoanPayment;

    // Calculate financial indicators (P50/median values)
    // TBD: Real API runs 10000 Monte Carlo simulations
    const npv = calculateNPV(
      capex,
      netAnnualSavings,
      MOCK_DISCOUNT_RATE,
      project_lifetime,
    );
    const irr = calculateIRR(capex, netAnnualSavings, project_lifetime);
    const pbp = calculateSimplePayback(capex, netAnnualSavings);
    const dpp = calculateDiscountedPayback(
      capex,
      netAnnualSavings,
      MOCK_DISCOUNT_RATE,
      project_lifetime,
    );
    const roi = calculateROI(capex, netAnnualSavings * project_lifetime);
    const monthlyAvgSavings = netAnnualSavings / 12;

    // Success rate: probability of positive NPV
    // TBD: Real API calculates from Monte Carlo distribution
    const successRate =
      npv > 0
        ? MOCK_SUCCESS_BASE_HIGH + Math.random() * MOCK_SUCCESS_RANDOM_HIGH
        : MOCK_SUCCESS_BASE_LOW + Math.random() * MOCK_SUCCESS_RANDOM_LOW;

    const pointForecasts: RiskAssessmentPointForecasts = {
      NPV: Math.round(npv * 100) / 100,
      IRR: Math.round(irr * 1000) / 1000,
      ROI: Math.round(roi * 1000) / 1000,
      PBP: Math.round(pbp * 10) / 10,
      DPP: Math.round(dpp * 10) / 10,
      MonthlyAvgSavings: Math.round(monthlyAvgSavings * 100) / 100,
      SuccessRate: Math.round(successRate * 1000) / 1000,
    };

    const metadata: RiskAssessmentMetadata = {
      n_sims: MOCK_N_SIMS,
      project_lifetime,
      capex,
      loan_amount,
      annual_loan_payment: Math.round(annualLoanPayment * 100) / 100,
      loan_rate_percent: loanRate * 100,
      output_level: request.output_level,
    };

    // TBD: Real API generates cash flow visualization for private level
    // Mock returns undefined (no visualization)
    return {
      pointForecasts,
      metadata,
      cashFlowVisualization: undefined,
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use calculateARV and assessRisk instead
   */
  async calculate(input: FinancialCalculationInput): Promise<FinancialResults> {
    const {
      renovationCost,
      annualEnergySavings,
      fundingOptions,
      scenario,
      floorArea,
      targetEPC,
    } = input;

    const scenarioMultiplier = MOCK_SCENARIO_MULTIPLIERS[scenario];
    const { effectiveCost, loanAmount } = applyFundingReduction(
      renovationCost,
      fundingOptions,
    );

    const adjustedAnnualSavings =
      annualEnergySavings * scenarioMultiplier.energyPrice;

    // Net annual savings after scenario adjustment
    const netAnnualSavings = adjustedAnnualSavings;

    const projectLifetime = MOCK_DEFAULT_PROJECT_LIFETIME;
    const npv = calculateNPV(
      effectiveCost,
      netAnnualSavings,
      MOCK_DISCOUNT_RATE,
      projectLifetime,
    );
    const irr = calculateIRR(effectiveCost, netAnnualSavings, projectLifetime);
    const paybackTime = calculateSimplePayback(effectiveCost, netAnnualSavings);
    const dpp = calculateDiscountedPayback(
      effectiveCost,
      netAnnualSavings,
      MOCK_DISCOUNT_RATE,
      projectLifetime,
    );
    const totalSavings = netAnnualSavings * projectLifetime;
    const roi = calculateROI(effectiveCost, totalSavings);

    // Calculate ARV using new method
    const arvRequest: ARVRequest = {
      lat: MOCK_DEFAULT_LAT,
      lng: MOCK_DEFAULT_LNG,
      floor_area: floorArea,
      construction_year: 1990, // Default for legacy compatibility
      number_of_floors: 4,
      property_type: "Apartment",
      energy_class: toAPIEnergyClass(targetEPC),
      renovated_last_5_years: true,
    };
    const arvResult = await this.calculateARV(arvRequest);

    // Calculate ranges for uncertainty display
    const npvRange = {
      min: npv * MOCK_RANGE_NPV_MIN,
      max: npv * MOCK_RANGE_NPV_MAX,
    };
    const paybackRange = {
      min: paybackTime * MOCK_RANGE_PAYBACK_MIN,
      max: paybackTime * MOCK_RANGE_PAYBACK_MAX,
    };

    return {
      // New structure
      arv: arvResult,
      riskAssessment: {
        pointForecasts: {
          NPV: Math.round(npv * 100) / 100,
          IRR: Math.round(irr * 1000) / 1000,
          ROI: Math.round(roi * 100) / 100,
          PBP: Math.round(paybackTime * 10) / 10,
          DPP: Math.round(dpp * 10) / 10,
          MonthlyAvgSavings: Math.round((netAnnualSavings / 12) * 100) / 100,
          SuccessRate: npv > 0 ? 0.85 : 0.4,
        },
        metadata: {
          n_sims: MOCK_N_SIMS,
          project_lifetime: projectLifetime,
          capex: renovationCost,
          loan_amount: loanAmount,
          output_level: HRA_OUTPUT_LEVEL,
        },
      },
      // Legacy fields for backward compatibility
      capitalExpenditure: Math.round(renovationCost),
      returnOnInvestment: Math.round(roi * 100) / 100,
      paybackTime: Math.round(paybackTime * 10) / 10,
      netPresentValue: Math.round(npv),
      afterRenovationValue: arvResult.totalPrice,
      npvRange: {
        min: Math.round(npvRange.min),
        max: Math.round(npvRange.max),
      },
      paybackTimeRange: {
        min: Math.round(paybackRange.min * 10) / 10,
        max: Math.round(paybackRange.max * 10) / 10,
      },
    };
  }

  /**
   * Calculate financial results for all scenarios
   */
  async calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    financialScenario: FinancialScenario,
    costs: Record<PackageId, number>,
    building: BuildingInfo,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const results: Record<string, FinancialResults> = {};

    for (const scenario of scenarios) {
      if (scenario.id === "current") {
        // Current scenario: no renovation, just current ARV
        const arvRequest: ARVRequest = {
          lat: building.lat ?? MOCK_DEFAULT_LAT,
          lng: building.lng ?? MOCK_DEFAULT_LNG,
          floor_area: floorArea,
          construction_year: building.constructionYear ?? 1990,
          number_of_floors: building.numberOfFloors ?? 4,
          floor_number: building.floorNumber,
          property_type: toAPIPropertyType(building.buildingType),
          energy_class: toAPIEnergyClass(currentEstimation.estimatedEPC),
          renovated_last_5_years: false,
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

      // Map scenario ID to package ID for cost lookup
      const packageMap: Record<string, PackageId> = {
        mild: "soft",
        regular: "regular",
        deep: "deep",
      };

      const packageId = packageMap[scenario.id];
      const costPerSqm = costs[packageId] || 0;
      const renovationCost = costPerSqm * floorArea;

      // Calculate annual energy savings (EUR)
      const annualEnergySavings =
        currentEstimation.annualEnergyCost - scenario.annualEnergyCost;

      // Use the logic from deprecated calculate() but avoid calling it directly if we want to be fully clean.
      // However, for now, to ensure full backward compatibility and identical behavior as requested in step 4,
      // I will keep using the calculate() method as a helper for this iteration, OR re-implement the logic inline
      // to remove dependency on the deprecated method.
      // The plan says "Remove the deprecated calculate method (it is unused outside the service)".
      // But wait, the previous code used `this.calculate`. If I remove it, I must inline it here.

      // Inline logic of `calculate` here to support `calculateForAllScenarios`
      const scenarioMultiplier = MOCK_SCENARIO_MULTIPLIERS[financialScenario];
      const { effectiveCost, loanAmount } = applyFundingReduction(
        renovationCost,
        fundingOptions,
      );

      const adjustedAnnualSavings =
        annualEnergySavings * scenarioMultiplier.energyPrice;

      // Net annual savings after scenario adjustment
      const netAnnualSavings = adjustedAnnualSavings;

      const projectLifetime = MOCK_DEFAULT_PROJECT_LIFETIME;
      const npv = calculateNPV(
        effectiveCost,
        netAnnualSavings,
        MOCK_DISCOUNT_RATE,
        projectLifetime,
      );
      const irr = calculateIRR(
        effectiveCost,
        netAnnualSavings,
        projectLifetime,
      );
      const paybackTime = calculateSimplePayback(
        effectiveCost,
        netAnnualSavings,
      );
      const dpp = calculateDiscountedPayback(
        effectiveCost,
        netAnnualSavings,
        MOCK_DISCOUNT_RATE,
        projectLifetime,
      );
      const totalSavings = netAnnualSavings * projectLifetime;
      const roi = calculateROI(effectiveCost, totalSavings);

      // ARV Request for this scenario
      const arvRequest: ARVRequest = {
        lat: building.lat ?? MOCK_DEFAULT_LAT,
        lng: building.lng ?? MOCK_DEFAULT_LNG,
        floor_area: floorArea,
        construction_year: building.constructionYear ?? 1990,
        number_of_floors: building.numberOfFloors ?? 4,
        floor_number: building.floorNumber,
        property_type: toAPIPropertyType(building.buildingType),
        energy_class: toAPIEnergyClass(scenario.epcClass),
        renovated_last_5_years: building.renovatedLast5Years,
      };
      const arvResult = await this.calculateARV(arvRequest);

      // Uncertainty ranges
      const npvRange = {
        min: npv * MOCK_RANGE_NPV_MIN,
        max: npv * MOCK_RANGE_NPV_MAX,
      };
      const paybackRange = {
        min: paybackTime * MOCK_RANGE_PAYBACK_MIN,
        max: paybackTime * MOCK_RANGE_PAYBACK_MAX,
      };

      // Construct Result
      const financialResult: FinancialResults = {
        arv: arvResult,
        riskAssessment: {
          pointForecasts: {
            NPV: Math.round(npv * 100) / 100,
            IRR: Math.round(irr * 1000) / 1000,
            ROI: Math.round(roi * 100) / 100,
            PBP: Math.round(paybackTime * 10) / 10,
            DPP: Math.round(dpp * 10) / 10,
            MonthlyAvgSavings: Math.round((netAnnualSavings / 12) * 100) / 100,
            SuccessRate: npv > 0 ? 0.85 : 0.4,
          },
          metadata: {
            n_sims: MOCK_N_SIMS,
            project_lifetime: projectLifetime,
            capex: renovationCost,
            loan_amount: loanAmount,
            output_level: HRA_OUTPUT_LEVEL,
          },
        },
        // Legacy fields
        capitalExpenditure: Math.round(renovationCost),
        returnOnInvestment: Math.round(roi * 100) / 100,
        paybackTime: Math.round(paybackTime * 10) / 10,
        netPresentValue: Math.round(npv),
        afterRenovationValue: arvResult.totalPrice,
        npvRange: {
          min: Math.round(npvRange.min),
          max: Math.round(npvRange.max),
        },
        paybackTimeRange: {
          min: Math.round(paybackRange.min * 10) / 10,
          max: Math.round(paybackRange.max * 10) / 10,
        },
      };

      results[scenario.id] = financialResult;
    }

    return results as Record<ScenarioId, FinancialResults>;
  }
}

// Export singleton instance
export const mockFinancialService: IFinancialService =
  new MockFinancialService();
