import type { MCDARankingResult, ScenarioId } from "../../context/types";

/** What the results screen knows about the recommendation, in one value. */
export type RankingStatus =
  /** `stale` while a newer ranking is being computed. */
  | { kind: "ready"; ranking: MCDARankingResult[]; stale: boolean }
  | { kind: "loading" }
  | { kind: "cannot-rank"; reason: "too-few-packages" | "missing-health-data" }
  | { kind: "failed"; message: string };

interface RankingInputs {
  ranking: MCDARankingResult[] | null;
  isRanking: boolean;
  error: string | null;
  healthImpactAvailable: boolean;
  eligiblePackageCount: number;
}

const MIN_PACKAGES_TO_RANK = 2;

export function canRank(
  inputs: Pick<RankingInputs, "healthImpactAvailable" | "eligiblePackageCount">,
): boolean {
  return (
    inputs.healthImpactAvailable &&
    inputs.eligiblePackageCount >= MIN_PACKAGES_TO_RANK
  );
}

export function deriveRankingStatus(inputs: RankingInputs): RankingStatus {
  if (!inputs.healthImpactAvailable) {
    return { kind: "cannot-rank", reason: "missing-health-data" };
  }
  if (inputs.eligiblePackageCount < MIN_PACKAGES_TO_RANK) {
    return { kind: "cannot-rank", reason: "too-few-packages" };
  }
  if (inputs.error) return { kind: "failed", message: inputs.error };
  if (inputs.ranking && inputs.ranking.length > 0) {
    return { kind: "ready", ranking: inputs.ranking, stale: inputs.isRanking };
  }
  return { kind: "loading" };
}

export function rankingOf(status: RankingStatus): MCDARankingResult[] | null {
  return status.kind === "ready" ? status.ranking : null;
}

/** Packages in rank order; unranked ones keep their order at the end. */
export function orderByRank<T extends { id: ScenarioId }>(
  scenarios: T[],
  ranking: MCDARankingResult[] | null,
): T[] {
  if (!ranking) return scenarios;
  const position = new Map(
    ranking.map((entry, index) => [entry.scenarioId, index]),
  );
  const rank = (scenario: T) => position.get(scenario.id) ?? ranking.length;
  return [...scenarios].sort((a, b) => rank(a) - rank(b));
}
