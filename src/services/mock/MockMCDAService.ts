/**
 * Mock MCDA Service
 * Provides Multi-Criteria Decision Analysis using TOPSIS algorithm.
 * Personas and weights are from D3.2 requirements.
 *
 * TBD INTEGRATION NOTES
 * =====================
 * When integrating with the real Technical API:
 * - [ ] Replace local TOPSIS with API pillar endpoints:
 *       - POST /technical/ee  - Energy Efficiency pillar
 *       - POST /financial/rei - Renewable Energy Integration pillar
 *       - POST /technical/sei - Sustainability & Environmental Impact pillar
 *       - POST /technical/uc  - User Comfort pillar
 *       - POST /technical/fv  - Financial Viability pillar
 * - [ ] Each endpoint requires KPI values with min/max bounds:
 *       - EE: envelope_kpi, window_kpi, heating_system_kpi, cooling_system_kpi
 *       - REI: st_coverage_kpi, onsite_res_kpi, net_energy_export_kpi
 *       - SEI: embodied_carbon_kpi, gwp_kpi
 *       - UC: thermal_comfort_air_temp_kpi, thermal_comfort_humidity_kpi
 *       - FV: ii_kpi, aoc_kpi, irr_kpi, npv_kpi
 * - [ ] Determine source of min/max normalization bounds (API config? Database?)
 * - [ ] Implement aggregation of 5 pillar weights into final ranking
 * - [ ] Map persona IDs to API "profile" parameter
 *
 * Current implementation uses local TOPSIS algorithm with D3.2 persona weights.
 *
 * Reference: api-specs/20260108-125427/technical.json
 */

import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../types/renovation";
import { extractCriteriaValues, topsis } from "../../utils/mcdaAlgorithms";
import type { IMCDAService, MCDAPersona } from "../types";
import { MOCK_DELAY_MEDIUM } from "./constants";
import { MCDA_PERSONAS } from "./data/personas";

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
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MEDIUM));

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
