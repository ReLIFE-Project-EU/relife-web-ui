/**
 * EnergyRenovationStep Component
 * Screen 2: Shows energy estimation results and allows renovation/funding selection.
 */

import { Alert, Box, Divider, Stack, Text, Title } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { ComfortDisplay, EnergyMixDisplay, EPCDisplay } from "../energy";
import { FundingOptions, RenovationPackages } from "../renovation";
import { ErrorAlert, StepNavigation } from "../shared";

export function EnergyRenovationStep() {
  const { state, dispatch } = useHomeAssistant();
  const { financial, renovation } = useHomeAssistantServices();

  // Check if at least one package is selected
  const hasSelectedPackages = state.renovation.selectedPackages.length > 0;

  // Check if selected packages have at least one intervention
  const hasValidSelections = state.renovation.selectedPackages.every(
    (pkgId) =>
      state.renovation.interventions[pkgId] &&
      state.renovation.interventions[pkgId].length > 0,
  );

  const canEvaluate = hasSelectedPackages && hasValidSelections;

  const handlePrevious = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const handleEvaluate = async () => {
    if (!state.estimation) return;

    dispatch({ type: "START_EVALUATION" });

    try {
      // Evaluate renovation scenarios
      const scenarios = await renovation.evaluateScenarios(
        state.building,
        state.estimation,
        state.renovation.selectedPackages,
        state.renovation.interventions,
        state.renovation.costs,
      );

      // Calculate financial results for all scenarios
      const financialResults = await financial.calculateForAllScenarios(
        scenarios,
        state.funding,
        state.building.floorArea || 100,
        state.estimation,
        state.selectedFinancialScenario,
        state.renovation.costs,
        state.building,
      );

      dispatch({
        type: "SET_EVALUATION_RESULTS",
        scenarios,
        financial: financialResults,
      });

      dispatch({ type: "NEXT_STEP" });
    } catch (error) {
      dispatch({
        type: "EVALUATION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate measures",
      });
    }
  };

  // Redirect to step 1 if no estimation data
  if (!state.estimation) {
    return (
      <Box>
        <Alert color="yellow" title="No estimation data">
          Please complete Step 1 first to estimate your building's energy
          performance.
        </Alert>
        <StepNavigation
          currentStep={1}
          totalSteps={3}
          onPrevious={handlePrevious}
        />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Energy Results & Renovation Options
        </Title>
        <Text c="dimmed" size="sm">
          Review your building's current energy performance and select
          renovation options.
        </Text>
      </Box>

      {/* Energy Estimation Results */}
      <EPCDisplay />

      {/* Energy Mix */}
      <EnergyMixDisplay />

      {/* Comfort Indices */}
      <ComfortDisplay />

      <Divider my="md" />

      {/* Renovation Packages Selection */}
      <RenovationPackages />

      <Divider my="md" />

      {/* Funding Options */}
      <FundingOptions />

      {/* Validation message */}
      {!canEvaluate && hasSelectedPackages && (
        <Alert color="yellow" title="Selection incomplete">
          Please ensure each selected package has at least one measure selected.
        </Alert>
      )}

      {!hasSelectedPackages && (
        <Alert color="blue" title="Select a renovation package">
          Choose at least one renovation package above to proceed with the
          evaluation.
        </Alert>
      )}

      {/* Error display */}
      <ErrorAlert error={state.error} title="Evaluation Error" />

      {/* Navigation */}
      <StepNavigation
        currentStep={1}
        totalSteps={3}
        onPrevious={handlePrevious}
        onPrimaryAction={handleEvaluate}
        primaryActionLabel="Evaluate Measures"
        isLoading={state.isEvaluating}
        primaryDisabled={!canEvaluate}
      />
    </Stack>
  );
}
