/**
 * Scenario lookups shared by the PRA results screen, drill-down and exporters.
 *
 * Kept in one place so the two scenario ids stay spelled once: the results
 * table, the CSV export and the aggregation all have to agree on which run is
 * the "before" and which is the package, or the figures beside each other stop
 * describing the same building.
 */

import type { RenovationScenario } from "../../../types/renovation";
import type { BuildingAnalysisResult } from "../context/types";
import { PRA_BASELINE_SCENARIO_ID, PRA_PACKAGE_ID } from "../constants";

/** The renovation package scenario, where the "after" figures live. */
export function renovatedOf(
  result: BuildingAnalysisResult,
): RenovationScenario | undefined {
  return result.scenarios?.find((s) => s.id === PRA_PACKAGE_ID);
}

/**
 * The re-simulated unrenovated building. This, not the step-1 estimation, is
 * what the Financial service prices savings against.
 */
export function baselineScenarioOf(
  result: BuildingAnalysisResult,
): RenovationScenario | undefined {
  return result.scenarios?.find((s) => s.id === PRA_BASELINE_SCENARIO_ID);
}
