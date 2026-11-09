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
import {
  appraisedFigures,
  savingsAvailabilityLabel,
  skipReasonAvailability,
} from "./savingsState";
import { MCDA_PERSONAS } from "./mock/data/personas";
import { auditLog, type AuditCtx } from "../utils/auditLogger";

const PERSONA_TO_PROFILE: Record<string, McdaProfile> = {
  "environmentally-conscious": "Environment-Oriented",
  "health-oriented": "Health-Oriented",
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
  "daly_kpi",
  "ii_kpi",
  "aoc_kpi",
  "irr_kpi",
  "npv_kpi",
  "pp_kpi",
  "arv_kpi",
];

/**
 * KPIs the pipeline can never populate. Sent as 0 across a fixed [-1, 1] range
 * so every technology normalizes identically and the criterion drops out of the
 * TOPSIS distances; the backend requires the keys and rejects a degenerate
 * range, so they cannot be omitted.
 *
 * Keep this list as short as the data allows: a neutralized KPI hands its
 * pillar-mates the pillar's whole weight. With `gwp_kpi` here,
 * `embodied_carbon_kpi` alone carried 57.6% of the Environment-Oriented
 * decision; it is now resolved per run by `resolveNeutralizedKpiKeys`.
 */
const BASE_NEUTRALIZED_KPI_KEYS: McdaKpiKey[] = [
  "window_kpi",
  "st_coverage_kpi",
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
    auditCtx?: AuditCtx,
  ): Promise<MCDARankingResult[]> {
    const renovationScenarios = scenarios.filter(
      (scenario) => scenario.id !== "current",
    );
    if (!hasCompleteHealthImpactData(renovationScenarios)) {
      auditLog.warn(
        "mcda",
        "mcda.rank.unavailable",
        { reason: "missing-health-impact" },
        auditCtx,
      );
      throw new Error(
        "MCDA ranking requires health impact data for every renovation scenario",
      );
    }

    const request = buildMcdaTopsisRequest(
      scenarios,
      financialResults,
      personaId,
    );

    auditLog.info(
      "mcda",
      "mcda.rank.start",
      {
        engine: "technical-topsis-backend",
        personaId,
        profile: request.profile,
        technologyCount: request.technologies.length,
        technologyNames: request.technologies.map((t) => t.name),
      },
      auditCtx,
    );

    const rankableScenarios = getRankingScenarioStatuses(
      scenarios,
      financialResults,
    )
      .filter((status) => status.eligible)
      .map((status) => status.scenario);
    const neutralizedKpis = resolveNeutralizedKpiKeys(
      rankableScenarios,
      financialResults,
    );

    auditLog.debug(
      "mcda",
      "mcda.kpi.mapping",
      {
        engine: "technical-topsis-backend",
        neutralizedKpis,
        operationalEmissionsAvailable: !neutralizedKpis.includes("gwp_kpi"),
        technologies: request.technologies,
        minsMaxes: request.mins_maxes,
      },
      auditCtx,
    );

    if (request.technologies.length < 2) {
      auditLog.info(
        "mcda",
        "mcda.rank.end",
        {
          engine: "technical-topsis-backend",
          ranking: [],
          reason: "insufficient-technologies",
        },
        auditCtx,
      );
      return [];
    }

    try {
      const response = await technical.runTopsis(request);
      const ranking = response.ranking.map((item, index) => ({
        scenarioId: item.name,
        rank: index + 1,
        score: item.closeness,
      }));

      auditLog.info(
        "mcda",
        "mcda.rank.end",
        {
          engine: "technical-topsis-backend",
          ranking,
        },
        auditCtx,
      );

      return ranking;
    } catch (error) {
      auditLog.error(
        "mcda",
        "mcda.rank.failed",
        { error: error instanceof Error ? error.message : String(error) },
        auditCtx,
      );
      throw error;
    }
  }
}

export function hasCompleteHealthImpactData(
  scenarios: RenovationScenario[],
): boolean {
  return scenarios.every((scenario) =>
    isFiniteNumber(scenario.avoidedThermalDalyPerPerson),
  );
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
  const neutralizedKeys = resolveNeutralizedKpiKeys(
    rankableScenarios,
    financialResults,
  );
  const technologies = rankableScenarios.map((scenario) => {
    const technology = deriveTechnologyKpis(
      scenario,
      financialResults[scenario.id],
    );
    // A neutralized KPI only drops out of TOPSIS if every technology sends 0.
    for (const key of neutralizedKeys) technology[key] = 0;
    return technology;
  });

  return {
    profile,
    technologies,
    mins_maxes:
      technologies.length > 0
        ? createMcdaMinsMaxes(technologies, neutralizedKeys)
        : createMcdaMinsMaxes(
            [deriveTechnologyKpis(baselineScenario, undefined)],
            neutralizedKeys,
          ),
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
  const forecasts = appraisedFigures(financial)?.pointForecasts;

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
    embodied_carbon_kpi: scenario.embodiedCarbonKgCo2e ?? 0,
    gwp_kpi: scenario.annualEmissionsTonCo2e ?? 0,
    daly_kpi: scenario.avoidedThermalDalyPerPerson ?? 0,
    ii_kpi: financial?.capitalExpenditure ?? 0,
    aoc_kpi: annualMaintenanceCost ?? 0,
    irr_kpi: forecasts?.IRR ?? 0,
    npv_kpi: forecasts?.NPV ?? 0,
    pp_kpi: forecasts?.PBP ?? 0,
    arv_kpi: financial?.afterRenovationValue ?? 0,
  };
}

/**
 * `gwp_kpi` joins the neutralized list unless every rankable scenario has
 * finite annual operational emissions, and `irr_kpi` unless every one yields a
 * finite IRR.
 *
 * Resolved per run rather than excluding scenarios, because operational
 * emissions are optional by design (`RenovationService.annotateScenarioEmissions`
 * leaves scenarios unannotated on failure). Excluding would turn one failed
 * emission-factor request into a ranking with no eligible packages, so the
 * degraded state is "rank without the emissions criterion", never "no ranking".
 */
export function resolveNeutralizedKpiKeys(
  rankableScenarios: RenovationScenario[],
  financialResults: Record<ScenarioId, FinancialResults>,
): McdaKpiKey[] {
  const everyFinite = (
    read: (scenario: RenovationScenario) => number | null | undefined,
  ) =>
    rankableScenarios.length > 0 &&
    rankableScenarios.every((scenario) => isFiniteNumber(read(scenario)));

  const keys = [...BASE_NEUTRALIZED_KPI_KEYS];
  if (!everyFinite((scenario) => scenario.annualEmissionsTonCo2e)) {
    keys.push("gwp_kpi");
  }
  if (
    !everyFinite(
      (scenario) =>
        appraisedFigures(financialResults[scenario.id])?.pointForecasts.IRR,
    )
  ) {
    keys.push("irr_kpi");
  }
  return keys;
}

export function createMcdaMinsMaxes(
  technologies: McdaTechnology[],
  neutralizedKeys: McdaKpiKey[],
): McdaMinsMaxes {
  const minsMaxes = {} as McdaMinsMaxes;

  for (const key of KPI_KEYS) {
    if (neutralizedKeys.includes(key)) {
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

  if (financial.appraisal.kind === "skipped") {
    return savingsAvailabilityLabel[
      skipReasonAvailability(financial.appraisal.reason)
    ];
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

  // Embodied carbon is scored lower-is-better, so a missing value falling
  // through to 0 in `deriveTechnologyKpis` would score a perfect result on the
  // criterion that carries the most weight for the environmental persona.
  if (!isFiniteNumber(scenario.embodiedCarbonKgCo2e)) {
    return "Material carbon data is missing";
  }

  if (!isFiniteNumber(scenario.avoidedThermalDalyPerPerson)) {
    return "Health impact data is missing";
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
    appraisedFigures(financial)?.metadata.annual_maintenance_cost;

  return financial?.annualMaintenanceCost ?? metadataValue;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
