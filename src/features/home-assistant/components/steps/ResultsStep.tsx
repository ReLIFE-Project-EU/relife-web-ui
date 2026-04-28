/**
 * ResultsStep Component
 * Screen 3: Recommendation-first dashboard built around the active MCDA
 * persona. Auto-ranks scenarios whenever the persona changes.
 */

import { useEffect, useState } from "react";
import { Alert, Box, Card, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { getRankingScenarioStatuses } from "../../../../services/TechnicalMCDAService";
import { CashFlowChart } from "../results/CashFlowChart";
import { CompareAllTable } from "../results/CompareAllTable";
import { EnergyDeepDive } from "../results/EnergyDeepDive";
import { FinancialDeepDive } from "../results/FinancialDeepDive";
import { RecommendationHero } from "../results/RecommendationHero";
import { ScenarioTabs } from "../results/ScenarioTabs";
import {
  getEffectiveDetailScenarioId,
  hasFinancialResultForScenario,
} from "../results/financialSelection";
import { ErrorAlert, StepNavigation } from "../shared";
import classes from "../results/ResultsLayout.module.css";
import type { CashFlowData, ScenarioId } from "../../context/types";

export function ResultsStep() {
  const { state, dispatch } = useHomeAssistant();
  const { mcda } = useHomeAssistantServices();
  const {
    scenarios,
    financialResults,
    selectedPersona,
    mcdaRanking,
    isRanking,
    funding,
  } = state;

  const currentScenario = scenarios.find((s) => s.id === "current");
  const renovationScenarios = scenarios.filter((s) => s.id !== "current");
  const personas = mcda.getPersonas();

  const rankingStatuses = getRankingScenarioStatuses(
    renovationScenarios,
    financialResults,
  );
  const eligibleScenarios = rankingStatuses
    .filter((status) => status.eligible)
    .map((status) => status.scenario);
  const canRank = eligibleScenarios.length >= 2 && !!currentScenario;

  // Auto-rank: trigger an MCDA call whenever the active persona changes
  // (and on first reach of step 3 once enough data is available).
  useEffect(() => {
    if (!canRank || !currentScenario) return;
    let cancelled = false;
    const run = async () => {
      dispatch({ type: "START_RANKING" });
      try {
        const ranking = await mcda.rank(
          [currentScenario, ...renovationScenarios],
          financialResults,
          selectedPersona,
        );
        if (!cancelled) dispatch({ type: "SET_RANKING", ranking });
      } catch (error) {
        if (cancelled) return;
        dispatch({
          type: "RANKING_ERROR",
          error:
            error instanceof Error
              ? error.message
              : "Failed to calculate ranking",
        });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona, canRank]);

  // Selected scenario for the deep-dive. Defaults to the current winner once
  // ranking is available; explicit user selections only need to still exist.
  const [selectedDetailId, setSelectedDetailId] = useState<ScenarioId | null>(
    null,
  );
  const winnerId = mcdaRanking?.[0]?.scenarioId ?? null;

  useEffect(() => {
    if (winnerId) {
      setSelectedDetailId(winnerId);
    }
  }, [winnerId]);

  const effectiveSelectedId = getEffectiveDetailScenarioId(
    renovationScenarios,
    financialResults,
    selectedDetailId,
  );
  const fallbackSelectedId =
    effectiveSelectedId ?? renovationScenarios[0]?.id ?? null;

  const selectedScenario = renovationScenarios.find(
    (s) => s.id === fallbackSelectedId,
  );
  const selectedResult = selectedScenario
    ? financialResults[selectedScenario.id]
    : undefined;
  const selectedHasFinancial = selectedScenario
    ? hasFinancialResultForScenario(financialResults, selectedScenario.id)
    : false;

  const cashFlowData: CashFlowData | undefined =
    selectedResult?.riskAssessment?.cashFlowData ??
    (selectedResult?.riskAssessment?.metadata.cash_flow_data as
      | CashFlowData
      | undefined);

  const handlePrevious = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const handleSelectPersona = (personaId: string) => {
    dispatch({ type: "SELECT_PERSONA", persona: personaId });
  };

  const handleSelectScenario = (scenarioId: ScenarioId) => {
    setSelectedDetailId(scenarioId);
  };

  if (scenarios.length === 0) {
    return (
      <Box>
        <Alert color="yellow" title="No evaluation data">
          Please complete Step 2 first to evaluate renovation measures.
        </Alert>
        <StepNavigation
          currentStep={2}
          totalSteps={3}
          onPrevious={handlePrevious}
        />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2} mb="xs">
          Your renovation results
        </Title>
        <Text c="dimmed" size="sm">
          A recommended pick tuned to your priorities, with the full numbers
          below. Switch profiles or packages to compare.
        </Text>
      </Box>

      <RecommendationHero
        currentScenario={currentScenario}
        renovationScenarios={renovationScenarios}
        financialResults={financialResults}
        ranking={mcdaRanking}
        isRanking={isRanking}
        canRank={canRank}
        personas={personas}
        selectedPersona={selectedPersona}
        selectedScenarioId={fallbackSelectedId}
        onSelectPersona={handleSelectPersona}
        onSelectScenario={handleSelectScenario}
      />

      {renovationScenarios.length > 0 ? (
        <Stack gap={0}>
          <ScenarioTabs
            renovationScenarios={renovationScenarios}
            ranking={mcdaRanking}
            selectedScenarioId={fallbackSelectedId}
            onSelectScenario={handleSelectScenario}
          />

          <section className={classes.deep}>
            {selectedScenario && currentScenario ? (
              <>
                <div className={classes.deepCols}>
                  <EnergyDeepDive
                    current={currentScenario}
                    selected={selectedScenario}
                    floorArea={state.building.floorArea ?? undefined}
                  />
                  <FinancialDeepDive
                    selected={selectedScenario}
                    result={selectedResult}
                    funding={funding}
                  />
                </div>

                {selectedHasFinancial ? (
                  <>
                    <div className={classes.cashflowHead}>
                      <div>
                        <div className={classes.deepEyebrow}>
                          Cash-flow timeline
                        </div>
                        <h3 className={classes.deepHeading}>
                          {selectedScenario.label}
                        </h3>
                      </div>
                    </div>
                    {cashFlowData ? (
                      <>
                        <CashFlowChart
                          data={cashFlowData}
                          projectLifetime={
                            selectedResult?.riskAssessment?.metadata
                              .project_lifetime
                          }
                          scenarioLabel={selectedScenario.label}
                        />
                        {cashFlowData.breakeven_year === null ? (
                          <div className={classes.warn}>
                            <IconAlertTriangle size={16} />
                            Does not break even within the selected project
                            horizon.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <Card withBorder radius="md" p="md">
                        <Text size="sm" c="dimmed">
                          Cash flow data is not available for{" "}
                          {selectedScenario.label} yet.
                        </Text>
                      </Card>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <Text c="dimmed" size="sm">
                Select a package above to inspect its details.
              </Text>
            )}
          </section>
        </Stack>
      ) : null}

      <CompareAllTable
        current={currentScenario}
        renovationScenarios={renovationScenarios}
        financialResults={financialResults}
        ranking={mcdaRanking}
        selectedScenarioId={fallbackSelectedId}
        onSelectScenario={handleSelectScenario}
      />

      <ErrorAlert error={state.error} />

      <StepNavigation
        currentStep={2}
        totalSteps={3}
        onPrevious={handlePrevious}
      />
    </Stack>
  );
}
