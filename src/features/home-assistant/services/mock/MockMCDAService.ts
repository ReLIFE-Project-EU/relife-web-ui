/**
 * Mock MCDA Service
 * Provides Multi-Criteria Decision Analysis using TOPSIS algorithm.
 * Personas and weights are from D3.2 requirements.
 *
 * NOTE: In production, this would integrate with the technical service API
 * for calculating individual pillar scores (EE, REI, SEI, UC, FV).
 */

import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type { IMCDAService, MCDAPersona } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// D3.2 MCDA Personas
// ─────────────────────────────────────────────────────────────────────────────

export const MCDA_PERSONAS: MCDAPersona[] = [
  {
    id: "environmentally-conscious",
    name: "Environmentally Conscious",
    description: "Prioritizes sustainability and renewable energy integration",
    weights: {
      sustainability: 0.333,
      resIntegration: 0.267,
      energyEfficiency: 0.2,
      userComfort: 0.133,
      financial: 0.067,
    },
  },
  {
    id: "comfort-driven",
    name: "Comfort-Driven",
    description: "Prioritizes indoor comfort and energy efficiency",
    weights: {
      userComfort: 0.333,
      energyEfficiency: 0.267,
      financial: 0.2,
      sustainability: 0.133,
      resIntegration: 0.067,
    },
  },
  {
    id: "cost-optimization",
    name: "Cost-Optimization Oriented",
    description: "Prioritizes financial returns and cost savings",
    weights: {
      financial: 0.333,
      energyEfficiency: 0.267,
      resIntegration: 0.2,
      userComfort: 0.133,
      sustainability: 0.067,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TOPSIS Algorithm Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface CriteriaValues {
  energyEfficiency: number;
  resIntegration: number;
  sustainability: number;
  userComfort: number;
  financial: number;
}

/**
 * Extract criteria values from a scenario and its financial results.
 * Higher values = better for all criteria (normalized).
 */
function extractCriteriaValues(
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
      Math.max(0, financial.returnOnInvestment / 200),
    );
    // NPV positive is good (normalize with sigmoid-like function)
    const npvScore =
      financial.netPresentValue > 0
        ? 0.5 + 0.5 * Math.tanh(financial.netPresentValue / 50000)
        : 0.5 * Math.tanh(financial.netPresentValue / 50000);
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
function topsis(
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

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockMCDAService implements IMCDAService {
  getPersonas(): MCDAPersona[] {
    return MCDA_PERSONAS;
  }

  getPersona(personaId: string): MCDAPersona | undefined {
    return MCDA_PERSONAS.find((p) => p.id === personaId);
  }

  async rank(
    scenarios: RenovationScenario[],
    financialResults: Record<ScenarioId, FinancialResults>,
    personaId: string,
  ): Promise<MCDARankingResult[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const persona = this.getPersona(personaId);
    if (!persona) {
      throw new Error(`Unknown persona: ${personaId}`);
    }

    // Filter out current scenario (we only rank renovation options)
    const renovationScenarios = scenarios.filter((s) => s.id !== "current");

    if (renovationScenarios.length === 0) {
      return [];
    }

    // Get baseline energy for normalization
    const currentScenario = scenarios.find((s) => s.id === "current");
    const baselineEnergy =
      currentScenario?.annualEnergyNeeds ||
      renovationScenarios[0].annualEnergyNeeds;

    // Extract criteria values for each scenario
    const criteriaMatrix = renovationScenarios.map((scenario) =>
      extractCriteriaValues(
        scenario,
        financialResults[scenario.id],
        baselineEnergy,
      ),
    );

    // Run TOPSIS
    const closenessScores = topsis(criteriaMatrix, persona.weights);

    // Create ranking results
    const results: MCDARankingResult[] = renovationScenarios.map(
      (scenario, i) => ({
        scenarioId: scenario.id,
        rank: 0, // Will be assigned below
        score: Math.round(closenessScores[i] * 100) / 100,
      }),
    );

    // Sort by score (descending) and assign ranks
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }
}

// Export singleton instance
export const mockMCDAService: IMCDAService = new MockMCDAService();
