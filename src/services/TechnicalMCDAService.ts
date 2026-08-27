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
import { computeLifetimeCarbonKgCo2e } from "./carrierSavingsService";
import { MCDA_PERSONAS } from "./mock/data/personas";
import { auditLog, type AuditCtx } from "../utils/auditLogger";

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
  "thermal_comfort_humidity_kpi",
];

/**
 * Groups measured in the same unit where one metric is a component of another.
 * Normalized independently they each stretch to a full 0-100, hiding that
 * material carbon is a few percent of lifetime carbon, so the group shares one
 * scale: 0 (the floor for a burden) to the group's largest value.
 *
 * Membership needs both: same unit AND containment. Mere siblings do not
 * qualify — heating/cooling primary energy was rejected because a shared kWh
 * axis compresses cooling below its discriminating range, draining weight from
 * the energy pillar.
 */
const SHARED_SCALE_KPI_GROUPS: McdaKpiKey[][] = [
  ["embodied_carbon_kpi", "gwp_kpi"],
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
        lifetimeCarbonAvailable: !neutralizedKpis.includes("gwp_kpi"),
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
  const neutralizedKeys = resolveNeutralizedKpiKeys(
    rankableScenarios,
    financialResults,
  );

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
    gwp_kpi: getLifetimeCarbonKgCo2e(scenario, financial) ?? 0,
    thermal_comfort_air_temp_kpi: scenario.comfortIndex,
    thermal_comfort_humidity_kpi: 0,
    ii_kpi: financial?.capitalExpenditure ?? 0,
    aoc_kpi: annualMaintenanceCost ?? 0,
    irr_kpi: financial?.riskAssessment?.pointForecasts.IRR ?? 0,
    npv_kpi: financial?.riskAssessment?.pointForecasts.NPV ?? 0,
    pp_kpi: financial?.riskAssessment?.pointForecasts.PBP ?? 0,
    arv_kpi: financial?.afterRenovationValue ?? 0,
  };
}

/**
 * `gwp_kpi` joins the neutralized list unless every rankable scenario yields a
 * finite lifetime-carbon figure.
 *
 * Resolved per run rather than excluding scenarios, because operational
 * emissions are optional by design (`RenovationService.annotateScenarioEmissions`
 * leaves scenarios unannotated on failure). Excluding would turn one failed
 * emission-factor request into a ranking with no eligible packages, so the
 * degraded state is "rank without the lifecycle criterion", never "no ranking".
 */
export function resolveNeutralizedKpiKeys(
  rankableScenarios: RenovationScenario[],
  financialResults: Record<ScenarioId, FinancialResults>,
): McdaKpiKey[] {
  const available =
    rankableScenarios.length > 0 &&
    rankableScenarios.every((scenario) =>
      isFiniteNumber(
        getLifetimeCarbonKgCo2e(scenario, financialResults[scenario.id]),
      ),
    );

  return available
    ? BASE_NEUTRALIZED_KPI_KEYS
    : [...BASE_NEUTRALIZED_KPI_KEYS, "gwp_kpi"];
}

// Required, not defaulted: the shared-scale rule below would otherwise fire on
// placeholder values whenever a caller omitted the resolved list.
export function createMcdaMinsMaxes(
  technologies: McdaTechnology[],
  neutralizedKeys: McdaKpiKey[],
): McdaMinsMaxes {
  const minsMaxes = {} as McdaMinsMaxes;
  const sharedScales = resolveSharedScales(technologies, neutralizedKeys);

  for (const key of KPI_KEYS) {
    if (neutralizedKeys.includes(key)) {
      minsMaxes[key] = [-1, 1];
      continue;
    }

    const shared = sharedScales.get(key);
    if (shared) {
      minsMaxes[key] = shared;
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

/**
 * Ranges for `SHARED_SCALE_KPI_GROUPS`. Skips a group when a member is
 * neutralized (its constant would set the ceiling) or the largest value is not
 * positive, leaving the per-key epsilon path to satisfy the backend's max > min.
 */
function resolveSharedScales(
  technologies: McdaTechnology[],
  neutralizedKeys: McdaKpiKey[],
): Map<McdaKpiKey, [number, number]> {
  const scales = new Map<McdaKpiKey, [number, number]>();

  for (const group of SHARED_SCALE_KPI_GROUPS) {
    if (group.some((key) => neutralizedKeys.includes(key))) continue;

    const max = Math.max(
      ...group.flatMap((key) =>
        technologies.map((technology) => technology[key]),
      ),
    );
    if (!Number.isFinite(max) || max <= 0) continue;

    for (const key of group) {
      scales.set(key, [0, max]);
    }
  }

  return scales;
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

  // Embodied carbon is scored lower-is-better, so a missing value falling
  // through to 0 in `deriveTechnologyKpis` would score a perfect result on the
  // criterion that carries the most weight for the environmental persona.
  if (!isFiniteNumber(scenario.embodiedCarbonKgCo2e)) {
    return "Material carbon data is missing";
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

/**
 * Derived here rather than stored on the scenario so a caller cannot leave it
 * unpopulated. Eligibility already requires `riskAssessment`, whose metadata
 * echoes the building's project lifetime.
 */
function getLifetimeCarbonKgCo2e(
  scenario: RenovationScenario,
  financial: FinancialResults | undefined,
): number | undefined {
  return computeLifetimeCarbonKgCo2e({
    embodiedCarbonKgCo2e: scenario.embodiedCarbonKgCo2e,
    annualOperationalEmissionsTonCo2e: scenario.annualEmissionsTonCo2e,
    projectLifetimeYears: financial?.riskAssessment?.metadata.project_lifetime,
  });
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
