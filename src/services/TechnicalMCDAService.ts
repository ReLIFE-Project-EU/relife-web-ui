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

const NEUTRALIZED_KPI_KEYS: McdaKpiKey[] = [
  "window_kpi",
  "st_coverage_kpi",
  "embodied_carbon_kpi",
  "gwp_kpi",
  "thermal_comfort_air_temp_kpi",
  "thermal_comfort_humidity_kpi",
];

export interface RankingScenarioStatus {
  scenario: RenovationScenario;
  eligible: boolean;
  reason: string | null;
}

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
  const rankableScenarios = getRankingScenarioStatuses(
    renovationScenarios,
    financialResults,
  )
    .filter((status) => status.eligible)
    .map((status) => status.scenario);
  const technologies = rankableScenarios.map((scenario) =>
    deriveTechnologyKpis(scenario, financialResults[scenario.id]),
  );

  return {
    profile,
    technologies,
    mins_maxes:
      technologies.length > 0
        ? createMcdaMinsMaxes(technologies)
        : createMcdaMinsMaxes([
            deriveTechnologyKpis(baselineScenario, undefined),
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
): McdaTechnology {
  const annualMaintenanceCost = getAnnualMaintenanceCost(financial);

  return {
    name: scenario.id,
    envelope_kpi: scenario.annualEnergyNeeds,
    window_kpi: 0,
    heating_system_kpi: scenario.heatingPrimaryEnergy ?? 0,
    cooling_system_kpi: scenario.coolingPrimaryEnergy ?? 0,
    st_coverage_kpi: 0,
    onsite_res_kpi:
      (scenario.pvSelfSufficiencyRate ?? scenario.pvSelfConsumptionRate ?? 0) *
      100,
    net_energy_export_kpi: scenario.pvGridExport ?? 0,
    embodied_carbon_kpi: 0,
    gwp_kpi: 0,
    thermal_comfort_air_temp_kpi: 0,
    thermal_comfort_humidity_kpi: 0,
    ii_kpi: financial?.capitalExpenditure ?? 0,
    aoc_kpi: annualMaintenanceCost ?? 0,
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
    if (NEUTRALIZED_KPI_KEYS.includes(key)) {
      minsMaxes[key] = [-1, 1];
      continue;
    }

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

export function getRankingScenarioStatuses(
  scenarios: RenovationScenario[],
  financialResults: Record<ScenarioId, FinancialResults>,
): RankingScenarioStatus[] {
  return scenarios
    .filter((scenario) => scenario.id !== "current")
    .map((scenario) => {
      const reason = getRankingExclusionReason(
        scenario,
        financialResults[scenario.id],
      );

      return {
        scenario,
        eligible: reason === null,
        reason,
      };
    });
}

function getRankingExclusionReason(
  scenario: RenovationScenario,
  financial: FinancialResults | undefined,
): string | null {
  if (!financial) {
    return "Financial data is missing";
  }

  if (!financial.riskAssessment) {
    return "No energy savings calculated";
  }

  if (!isFiniteNumber(getAnnualMaintenanceCost(financial))) {
    return "Maintenance cost data is missing";
  }

  if (!isFiniteNumber(scenario.annualEnergyNeeds)) {
    return "Energy data is incomplete";
  }

  if (
    !isFiniteNumber(scenario.heatingPrimaryEnergy) ||
    !isFiniteNumber(scenario.coolingPrimaryEnergy)
  ) {
    return "Energy data is incomplete";
  }

  if (scenario.measureIds.includes("pv")) {
    const hasPvBalance =
      isFiniteNumber(scenario.pvGeneration) &&
      isFiniteNumber(scenario.pvSelfConsumption) &&
      isFiniteNumber(scenario.pvGridExport);
    const hasPvRate =
      isFiniteNumber(scenario.pvSelfSufficiencyRate) ||
      isFiniteNumber(scenario.pvSelfConsumptionRate);

    if (!hasPvBalance || !hasPvRate) {
      return "Solar panel data is incomplete";
    }
  }

  return null;
}

function getAnnualMaintenanceCost(
  financial: FinancialResults | undefined,
): number | undefined {
  const metadataValue =
    financial?.riskAssessment?.metadata.annual_maintenance_cost;

  return financial?.annualMaintenanceCost ?? metadataValue;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
