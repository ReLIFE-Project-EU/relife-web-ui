import { technical } from "../api";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../types/renovation";
import type {
  McdaKpiKey,
  McdaMinsMaxes,
  McdaProfile,
  McdaTechnology,
  McdaTopsisRequest,
} from "../types/technical";
import type { IMCDAService, MCDAPersona } from "./types";
import { MCDA_PERSONAS } from "./mock/data/personas";

const PERSONA_TO_PROFILE: Record<string, McdaProfile> = {
  "environmentally-conscious": "Environment-Oriented",
  "comfort-driven": "Comfort-Oriented",
  "cost-optimization": "Financially-Oriented",
};

const KPI_KEYS: McdaKpiKey[] = [
  "envelope_kpi",
  "window_kpi",
  "heating_system_kpi",
  "cooling_system_kpi",
  "st_coverage_kpi",
  "onsite_res_kpi",
  "net_energy_export_kpi",
  "embodied_carbon_kpi",
  "gwp_kpi",
  "thermal_comfort_air_temp_kpi",
  "thermal_comfort_humidity_kpi",
  "ii_kpi",
  "aoc_kpi",
  "irr_kpi",
  "npv_kpi",
  "pp_kpi",
  "arv_kpi",
];

export class TechnicalMCDAService implements IMCDAService {
  getPersonas(): MCDAPersona[] {
    return MCDA_PERSONAS;
  }

  getPersona(personaId: string): MCDAPersona | undefined {
    return MCDA_PERSONAS.find((persona) => persona.id === personaId);
  }

  async rank(
    scenarios: RenovationScenario[],
    financialResults: Record<ScenarioId, FinancialResults>,
    personaId: string,
  ): Promise<MCDARankingResult[]> {
    const request = buildMcdaTopsisRequest(
      scenarios,
      financialResults,
      personaId,
    );

    if (request.technologies.length < 2) {
      return [];
    }

    const response = await technical.runTopsis(request);

    return response.ranking.map((item, index) => ({
      scenarioId: item.name,
      rank: index + 1,
      score: item.closeness,
    }));
  }
}

export function buildMcdaTopsisRequest(
  scenarios: RenovationScenario[],
  financialResults: Record<ScenarioId, FinancialResults>,
  personaId: string,
): McdaTopsisRequest {
  const profile = mapPersonaToProfile(personaId);
  const baselineScenario = scenarios.find(
    (scenario) => scenario.id === "current",
  );

  if (!baselineScenario) {
    throw new Error("MCDA ranking requires a baseline scenario");
  }

  const renovationScenarios = scenarios.filter(
    (scenario) => scenario.id !== "current",
  );
  const technologies = renovationScenarios.map((scenario) =>
    deriveTechnologyKpis(
      scenario,
      financialResults[scenario.id],
      baselineScenario,
    ),
  );

  return {
    profile,
    technologies,
    mins_maxes:
      technologies.length > 0
        ? createMcdaMinsMaxes(technologies)
        : createMcdaMinsMaxes([
            deriveTechnologyKpis(baselineScenario, undefined, baselineScenario),
          ]),
  };
}

export function mapPersonaToProfile(personaId: string): McdaProfile {
  const profile = PERSONA_TO_PROFILE[personaId];

  if (!profile) {
    throw new Error(`Unknown MCDA persona: ${personaId}`);
  }

  return profile;
}

export function deriveTechnologyKpis(
  scenario: RenovationScenario,
  financial: FinancialResults | undefined,
  baselineScenario: RenovationScenario,
): McdaTechnology {
  const baselineEnergy = Math.max(1, baselineScenario.annualEnergyNeeds);
  const annualEnergyReductionPct =
    ((baselineScenario.annualEnergyNeeds - scenario.annualEnergyNeeds) /
      baselineEnergy) *
    100;
  const envelopeScore = Math.max(0, annualEnergyReductionPct);

  return {
    name: scenario.id,
    envelope_kpi: envelopeScore,
    window_kpi: scenario.measureIds.includes("windows") ? envelopeScore : 0,
    heating_system_kpi: 0,
    cooling_system_kpi: 0,
    st_coverage_kpi: 0,
    onsite_res_kpi: 0,
    net_energy_export_kpi: 0,
    embodied_carbon_kpi: 0,
    gwp_kpi: 0,
    thermal_comfort_air_temp_kpi: scenario.comfortIndex,
    thermal_comfort_humidity_kpi: 0,
    ii_kpi: financial?.capitalExpenditure ?? 0,
    aoc_kpi: scenario.annualEnergyCost,
    irr_kpi: financial?.riskAssessment?.pointForecasts.IRR ?? 0,
    npv_kpi: financial?.riskAssessment?.pointForecasts.NPV ?? 0,
    pp_kpi: financial?.riskAssessment?.pointForecasts.PBP ?? 0,
    arv_kpi: financial?.afterRenovationValue ?? 0,
  };
}

export function createMcdaMinsMaxes(
  technologies: McdaTechnology[],
): McdaMinsMaxes {
  const minsMaxes = {} as McdaMinsMaxes;

  for (const key of KPI_KEYS) {
    const values = technologies.map((technology) => technology[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const epsilon = Math.max(1, Math.abs(min) * 0.01);
      minsMaxes[key] = [min - epsilon, max + epsilon];
      continue;
    }

    minsMaxes[key] = [min, max];
  }

  return minsMaxes;
}
