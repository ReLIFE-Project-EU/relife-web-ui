/**
 * EnergyRenovationStep Component
 * Screen 2: Shows energy estimation results and allows renovation/funding selection.
 */

import { useEffect } from "react";
import { Alert, Box, Divider, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { ComfortDisplay, EnergyMixDisplay, EPCDisplay } from "../energy";
import {
  FundingOptions,
  MeasureSelector,
  PackageSelector,
  areSelectedPackagesReady,
} from "../renovation";
import { ErrorAlert, StepNavigation } from "../shared";

export function EnergyRenovationStep() {
  const { state, dispatch } = useHomeAssistant();
  const { financial, renovation } = useHomeAssistantServices();

  const selectedMeasures = state.renovation.selectedMeasures;
  const suggestedPackages = state.suggestedPackages;
  const selectedPackageIds = state.selectedPackageIds;
  const packageFinancialInputs = state.packageFinancialInputs;
  const floorArea = state.building.floorArea || 100;

  // Identify unsupported measures that are selected (if any)
  const unsupportedSelected = selectedMeasures.filter(
    (measureId) => !renovation.isAnalysisEligibleMeasure(measureId),
  );

  const canEvaluate = areSelectedPackagesReady(
    selectedPackageIds,
    packageFinancialInputs,
  );

  useEffect(() => {
    const nextPackages = renovation.suggestPackages(selectedMeasures);
    const hasSamePackages =
      nextPackages.length === suggestedPackages.length &&
      nextPackages.every(
        (pkg, index) =>
          suggestedPackages[index]?.id === pkg.id &&
          suggestedPackages[index]?.measureIds.join(",") ===
            pkg.measureIds.join(","),
      );

    if (hasSamePackages) {
      return;
    }

    dispatch({
      type: "SET_SUGGESTED_PACKAGES",
      packages: nextPackages,
    });
  }, [dispatch, renovation, selectedMeasures, suggestedPackages]);

  const handlePrevious = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const handleEvaluate = async () => {
    if (!state.estimation) return;

    dispatch({ type: "START_EVALUATION" });

    try {
      const selectedPackages = suggestedPackages.filter((pkg) =>
        selectedPackageIds.includes(pkg.id),
      );

      const scenarios = await renovation.evaluateScenarios(
        state.building,
        state.estimation,
        selectedPackages,
      );

      // Calculate financial results for all scenarios
      const financialResults = await financial.calculateForAllScenarios({
        scenarios,
        fundingOptions: state.funding,
        floorArea,
        currentEstimation: state.estimation,
        packageFinancialInputs: state.packageFinancialInputs,
        building: state.building,
      });

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

      {/* Renovation Measures Selection */}
      <MeasureSelector />

      {/* Warning for unsupported measures */}
      {unsupportedSelected.length > 0 && (
        <Alert
          color="yellow"
          icon={<IconInfoCircle size={16} />}
          title="Limited Simulation Support"
        >
          The following measures are not yet supported for simulation:{" "}
          <Text span fw={700}>
            {unsupportedSelected
              .map((m) => renovation.getMeasure(m)?.name)
              .join(", ")}
          </Text>
          . These measures are currently excluded from evaluation in the
          comparison workflow.
        </Alert>
      )}

      {suggestedPackages.length > 0 ? (
        <PackageSelector />
      ) : selectedMeasures.length > 0 ? (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          No evaluation options are available from the current selection. Select
          at least one envelope measure, a supported system upgrade, or a
          combination of both to continue.
        </Alert>
      ) : null}

      <Divider my="md" />

      {/* Funding Options */}
      <FundingOptions />

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
