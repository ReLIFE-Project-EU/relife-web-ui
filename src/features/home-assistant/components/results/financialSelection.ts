import type { FinancialResults, ScenarioId } from "../../context/types";

export function hasFinancialResultForScenario(
  financialResults: Partial<Record<ScenarioId, FinancialResults>>,
  scenarioId: ScenarioId,
): boolean {
  return Boolean(financialResults[scenarioId]);
}

export function getEffectiveDetailScenarioId(
  scenarios: Array<{ id: ScenarioId }>,
  financialResults: Partial<Record<ScenarioId, FinancialResults>>,
  selectedScenarioId: ScenarioId | null,
): ScenarioId | null {
  if (
    selectedScenarioId &&
    scenarios.some((scenario) => scenario.id === selectedScenarioId) &&
    hasFinancialResultForScenario(financialResults, selectedScenarioId)
  ) {
    return selectedScenarioId;
  }

  return (
    scenarios.find((scenario) =>
      hasFinancialResultForScenario(financialResults, scenario.id),
    )?.id ?? null
  );
}
