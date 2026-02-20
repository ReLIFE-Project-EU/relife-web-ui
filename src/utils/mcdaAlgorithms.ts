import type { FinancialResults, RenovationScenario } from "../types/renovation";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalization factor for ROI in MCDA.
 * The Financial API returns ROI as a dimensionless fraction (e.g., 1.423 = 142.3% return).
 * A value of 2.0 caps the score at 1.0 when ROI reaches 200% (fraction = 2.0).
 * Duplicated here to keep utility pure and avoid circular dependencies.
 */
const MCDA_MAX_ROI_NORMALIZATION = 2.0;

/**
 * Normalization factor for NPV in MCDA
 * Duplicated here to keep utility pure and avoid circular dependencies
 */
const MCDA_NPV_NORMALIZATION_FACTOR = 50000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CriteriaValues {
  energyEfficiency: number;
  resIntegration: number;
  sustainability: number;
  userComfort: number;
  financial: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract criteria values from a scenario and its financial results.
 * Higher values = better for all criteria (normalized).
 */
export function extractCriteriaValues(
  scenario: RenovationScenario,
  financial: FinancialResults | undefined,
  baselineEnergy: number,
): CriteriaValues {
  // Energy Efficiency: inverse of energy needs (lower energy = higher score)
  const energyEfficiency =
    baselineEnergy > 0 ? 1 - scenario.annualEnergyNeeds / baselineEnergy : 0;

  // RES Integration: based on EPC class (simplified proxy)
  const epcOrder = ["G", "F", "E", "D", "C", "B", "A", "A+"];
  const epcIndex = epcOrder.indexOf(scenario.epcClass);
  const resIntegration = epcIndex >= 0 ? epcIndex / (epcOrder.length - 1) : 0;

  // Sustainability: combination of energy reduction and EPC improvement
  const sustainability = (energyEfficiency + resIntegration) / 2;

  // User Comfort: directly from scenario
  const userComfort = scenario.comfortIndex / 100;

  // Financial: based on ROI and NPV (higher = better)
  let financialScore = 0;
  if (financial) {
    // Normalize ROI to 0-1 range (assuming max ROI of 200%)
    const roiScore = Math.min(
      1,
      Math.max(0, financial.returnOnInvestment / MCDA_MAX_ROI_NORMALIZATION),
    );
    // NPV positive is good (normalize with sigmoid-like function)
    const npvScore =
      financial.netPresentValue > 0
        ? 0.5 +
          0.5 *
            Math.tanh(financial.netPresentValue / MCDA_NPV_NORMALIZATION_FACTOR)
        : 0.5 *
          Math.tanh(financial.netPresentValue / MCDA_NPV_NORMALIZATION_FACTOR);
    financialScore = (roiScore + npvScore) / 2;
  }

  return {
    energyEfficiency: Math.max(0, Math.min(1, energyEfficiency)),
    resIntegration: Math.max(0, Math.min(1, resIntegration)),
    sustainability: Math.max(0, Math.min(1, sustainability)),
    userComfort: Math.max(0, Math.min(1, userComfort)),
    financial: Math.max(0, Math.min(1, financialScore)),
  };
}

/**
 * TOPSIS algorithm implementation.
 * Returns closeness coefficient for each alternative (0-1, higher = better).
 */
export function topsis(
  alternatives: CriteriaValues[],
  weights: CriteriaValues,
): number[] {
  if (alternatives.length === 0) return [];
  if (alternatives.length === 1) return [1];

  const criteria: (keyof CriteriaValues)[] = [
    "energyEfficiency",
    "resIntegration",
    "sustainability",
    "userComfort",
    "financial",
  ];

  // Step 1: Create decision matrix (already normalized 0-1)
  const matrix = alternatives.map((alt) => criteria.map((c) => alt[c]));

  // Step 2: Apply weights
  const weightedMatrix = matrix.map((row) =>
    row.map((val, j) => val * weights[criteria[j]]),
  );

  // Step 3: Find ideal best and worst
  const idealBest = criteria.map((_, j) =>
    Math.max(...weightedMatrix.map((row) => row[j])),
  );
  const idealWorst = criteria.map((_, j) =>
    Math.min(...weightedMatrix.map((row) => row[j])),
  );

  // Step 4: Calculate distances
  const distanceToBest = weightedMatrix.map((row) =>
    Math.sqrt(
      row.reduce((sum, val, j) => sum + Math.pow(val - idealBest[j], 2), 0),
    ),
  );
  const distanceToWorst = weightedMatrix.map((row) =>
    Math.sqrt(
      row.reduce((sum, val, j) => sum + Math.pow(val - idealWorst[j], 2), 0),
    ),
  );

  // Step 5: Calculate closeness coefficient
  const closeness = distanceToBest.map((dBest, i) => {
    const dWorst = distanceToWorst[i];
    const total = dBest + dWorst;
    return total > 0 ? dWorst / total : 0.5;
  });

  return closeness;
}
