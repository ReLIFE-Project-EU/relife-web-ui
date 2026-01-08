/**
 * Mock Financial Service
 * Provides financial indicator calculations (NPV, ROI, Payback, ARV).
 *
 * NOTE: In production, this would integrate with the financial service API:
 * - financial.assessRisk() for Monte Carlo simulation
 * - financial.calculateARV() for property value estimation
 */

import type {
  EstimationResult,
  FinancialResults,
  FinancialScenario,
  FundingOptions,
  PackageId,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type { FinancialCalculationInput, IFinancialService } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Financial Constants
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_LIFETIME_YEARS = 25;
const DISCOUNT_RATE = 0.03; // 3% annual discount rate

// Scenario multipliers for financial projections
const SCENARIO_MULTIPLIERS: Record<
  FinancialScenario,
  { energyPrice: number; inflation: number; propertyValue: number }
> = {
  baseline: { energyPrice: 1.0, inflation: 1.0, propertyValue: 1.0 },
  optimistic: { energyPrice: 1.3, inflation: 0.9, propertyValue: 1.15 },
  pessimistic: { energyPrice: 0.8, inflation: 1.15, propertyValue: 0.9 },
};

// EPC class impact on property value (percentage increase per class improvement)
const EPC_VALUE_IMPACT: Record<string, number> = {
  "A+": 0.15,
  A: 0.12,
  B: 0.08,
  C: 0.04,
  D: 0.0,
  E: -0.03,
  F: -0.06,
  G: -0.1,
};

// Base property value per m² (EUR) - simplified average
const BASE_PROPERTY_VALUE_PER_SQM = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function calculateNPV(
  initialInvestment: number,
  annualSavings: number,
  discountRate: number,
  years: number,
): number {
  let npv = -initialInvestment;

  for (let year = 1; year <= years; year++) {
    npv += annualSavings / Math.pow(1 + discountRate, year);
  }

  return npv;
}

function calculateSimplePayback(
  investment: number,
  annualSavings: number,
): number {
  if (annualSavings <= 0) return Infinity;
  return investment / annualSavings;
}

function calculateROI(investment: number, totalSavings: number): number {
  if (investment <= 0) return 0;
  return ((totalSavings - investment) / investment) * 100;
}

function calculateARV(
  floorArea: number,
  _currentEPC: string, // Kept for potential future use in value change calculation
  targetEPC: string,
  scenario: FinancialScenario,
): number {
  const baseValue = floorArea * BASE_PROPERTY_VALUE_PER_SQM;
  const targetFactor = 1 + (EPC_VALUE_IMPACT[targetEPC] || 0);

  const scenarioMultiplier = SCENARIO_MULTIPLIERS[scenario].propertyValue;

  // ARV = base value * target EPC factor * scenario adjustment
  const arv = baseValue * targetFactor * scenarioMultiplier;

  // Round to nearest 1000
  return Math.round(arv / 1000) * 1000;
}

function applyFundingReduction(
  totalCost: number,
  fundingOptions: FundingOptions,
): {
  effectiveCost: number;
  loanAmount: number;
  subsidyAmount: number;
} {
  let subsidyAmount = 0;
  let loanAmount = 0;

  // Apply subsidy first
  if (fundingOptions.subsidy.enabled) {
    const maxSubsidy = Math.min(
      totalCost * (fundingOptions.subsidy.percentOfTotal / 100),
      fundingOptions.subsidy.amountLimit,
    );
    subsidyAmount = maxSubsidy;
  }

  // Apply loan (affects cash flow, not effective cost)
  if (fundingOptions.loan.enabled) {
    const maxLoan = Math.min(
      totalCost - subsidyAmount,
      fundingOptions.loan.amountLimit,
    );
    loanAmount = maxLoan;
  }

  // Effective upfront cost = total - subsidy (loan still needs to be repaid)
  const effectiveCost = totalCost - subsidyAmount;

  return { effectiveCost, loanAmount, subsidyAmount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockFinancialService implements IFinancialService {
  async calculate(input: FinancialCalculationInput): Promise<FinancialResults> {
    const {
      renovationCost,
      annualEnergySavings,
      fundingOptions,
      scenario,
      floorArea,
      currentEPC,
      targetEPC,
    } = input;

    const scenarioMultiplier = SCENARIO_MULTIPLIERS[scenario];

    // Apply funding options
    const { effectiveCost } = applyFundingReduction(
      renovationCost,
      fundingOptions,
    );

    // Adjust savings based on scenario
    const adjustedAnnualSavings =
      annualEnergySavings * scenarioMultiplier.energyPrice;

    // Apply on-bill repayment if enabled
    let netAnnualSavings = adjustedAnnualSavings;
    if (fundingOptions.returnsOnBills.enabled) {
      netAnnualSavings =
        adjustedAnnualSavings *
        (1 - fundingOptions.returnsOnBills.percentOfSavedEnergy / 100);
    }

    // Calculate financial indicators
    const npv = calculateNPV(
      effectiveCost,
      netAnnualSavings,
      DISCOUNT_RATE,
      PROJECT_LIFETIME_YEARS,
    );
    const paybackTime = calculateSimplePayback(effectiveCost, netAnnualSavings);
    const totalSavings = netAnnualSavings * PROJECT_LIFETIME_YEARS;
    const roi = calculateROI(effectiveCost, totalSavings);
    const arv = calculateARV(floorArea, currentEPC, targetEPC, scenario);

    // Calculate ranges for uncertainty display
    const npvRange = {
      min: npv * 0.8,
      max: npv * 1.2,
    };
    const paybackRange = {
      min: paybackTime * 0.85,
      max: paybackTime * 1.15,
    };

    return {
      capitalExpenditure: Math.round(renovationCost),
      returnOnInvestment: Math.round(roi * 10) / 10,
      paybackTime: Math.round(paybackTime * 10) / 10,
      netPresentValue: Math.round(npv),
      afterRenovationValue: arv,
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

  async calculateForAllScenarios(
    scenarios: RenovationScenario[],
    fundingOptions: FundingOptions,
    floorArea: number,
    currentEstimation: EstimationResult,
    financialScenario: FinancialScenario,
    costs: Record<PackageId, number>,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const results: Record<string, FinancialResults> = {};

    for (const scenario of scenarios) {
      if (scenario.id === "current") {
        // Current scenario has no renovation cost
        results[scenario.id] = {
          capitalExpenditure: 0,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: calculateARV(
            floorArea,
            currentEstimation.estimatedEPC,
            scenario.epcClass,
            financialScenario,
          ),
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

      // Calculate annual energy savings
      const annualEnergySavings =
        currentEstimation.annualEnergyCost - scenario.annualEnergyCost;

      const financialResult = await this.calculate({
        renovationCost,
        annualEnergySavings,
        fundingOptions,
        scenario: financialScenario,
        floorArea,
        currentEPC: currentEstimation.estimatedEPC,
        targetEPC: scenario.epcClass,
      });

      results[scenario.id] = financialResult;
    }

    return results as Record<ScenarioId, FinancialResults>;
  }
}

// Export singleton instance
export const mockFinancialService: IFinancialService =
  new MockFinancialService();
