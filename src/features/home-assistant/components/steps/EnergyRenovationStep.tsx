/**
 * EnergyRenovationStep Component
 * Screen 2: Shows energy estimation results and allows renovation/funding selection.
 */

import { useContext, useEffect } from "react";
import { Alert, Box, Divider, Flex, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { EnergyTariffPanel } from "../../../../components/shared/EnergyTariffPanel";
import { GlobalLoadingContext } from "../../../../contexts/global-loading";
import { estimatePackageEmbodiedCarbon } from "../../../../services/embodiedCarbon";
import { logEnergyTariff } from "../../../../services/energyTariffService";
import { auditLog } from "../../../../utils/auditLogger";
import { errorMessage } from "../../../../utils/errorMessage";
import { LineageLink } from "../../../lineage";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { usePackageCostEstimation } from "../../hooks/usePackageCostEstimation";
import { EnergyMixDisplay, EPCDisplay } from "../energy";
import {
  FundingOptions,
  MeasureSelector,
  PackageSelector,
  areSelectedPackagesReady,
} from "../renovation";
import { ErrorAlert, StepNavigation } from "../shared";

export function EnergyRenovationStep() {
  const { state, dispatch, gasTariff, electricityTariff } = useHomeAssistant();
  const { financial, renovation } = useHomeAssistantServices();
  const { withLoading } = useContext(GlobalLoadingContext);

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

  // Single source of the cost-estimation pre-pass; PackageSelector is rendered
  // here, so this keeps exactly one hook instance / effect.
  const { estimatingIds, errorsById, retry } = usePackageCostEstimation();
  const isEstimatingCosts = estimatingIds.size > 0;

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
    if (
      !state.estimation ||
      gasTariff.isLoading ||
      electricityTariff.isLoading ||
      gasTariff.eurPerKwh === null ||
      electricityTariff.eurPerKwh === null
    )
      return;

    dispatch({ type: "START_EVALUATION" });
    const auditCtx = auditLog.current() ?? undefined;
    logEnergyTariff("gas", gasTariff.eurPerKwh, gasTariff.reference, auditCtx);
    logEnergyTariff(
      "electricity",
      electricityTariff.eurPerKwh,
      electricityTariff.reference,
      auditCtx,
    );

    try {
      const selectedPackages = suggestedPackages.filter((pkg) =>
        selectedPackageIds.includes(pkg.id),
      );

      const evaluated = await withLoading(
        renovation.evaluateScenarios(
          state.building,
          state.estimation,
          selectedPackages,
          auditCtx,
        ),
        "HomeAssistant.evaluate.energy",
      );

      // Material carbon rides along with the scenarios so ranking eligibility
      // sees it, from the same simulated-building share as the cost lookup.
      const simulated = state.estimation.simulated;
      const embodiedCarbon = evaluated.map((scenario) =>
        scenario.measureIds.length === 0
          ? null
          : estimatePackageEmbodiedCarbon({
              simulated,
              measureIds: scenario.measureIds,
            }),
      );

      const scenarios = evaluated.map((scenario, index) => {
        const kgCO2e = embodiedCarbon[index];
        return kgCO2e === null
          ? scenario
          : { ...scenario, embodiedCarbonKgCo2e: kgCO2e };
      });

      // Calculate financial results for all scenarios
      const financialResults = await withLoading(
        financial.calculateForAllScenarios({
          scenarios,
          fundingOptions: state.funding,
          floorArea,
          packageFinancialInputs: state.packageFinancialInputs,
          building: state.building,
          financialAssumptions: {
            gasTariffEurPerKwh: gasTariff.eurPerKwh,
            electricityTariffEurPerKwh: electricityTariff.eurPerKwh,
          },
          auditCtx,
        }),
        "HomeAssistant.evaluate.financial",
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
            ? errorMessage(error)
            : "Failed to evaluate measures",
      });
    }
  };

  // Redirect to step 1 if no estimation data
  if (!state.estimation) {
    return (
      <Box>
        <Alert color="yellow">Complete step 1 first.</Alert>
        <StepNavigation
          currentStep={1}
          totalSteps={3}
          onPrevious={handlePrevious}
          previousLabel="Back to building details"
        />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Flex
        direction={{ base: "column", md: "row" }}
        align="flex-start"
        gap="md"
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Title order={2}>Energy results & renovation options</Title>
        </Box>
        <LineageLink scope="hra" />
      </Flex>

      {/* Energy Estimation Results */}
      <EPCDisplay />

      {/* Energy Mix */}
      <EnergyMixDisplay />

      <Divider my="md" />

      {/* Renovation Measures Selection */}
      <MeasureSelector />

      {/* Warning for unsupported measures */}
      {unsupportedSelected.length > 0 && (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          Excluded from analysis:{" "}
          <Text span fw={700}>
            {unsupportedSelected
              .map((m) => renovation.getMeasure(m)?.name)
              .join(", ")}
          </Text>
          .
        </Alert>
      )}

      {suggestedPackages.length > 0 ? (
        <PackageSelector
          estimatingIds={estimatingIds}
          errorsById={errorsById}
          retry={retry}
        />
      ) : selectedMeasures.length > 0 ? (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          Select at least one supported measure to continue.
        </Alert>
      ) : null}

      <Divider my="md" />

      {/* Funding Options */}
      <FundingOptions />

      <EnergyTariffPanel
        gasTariff={gasTariff}
        electricityTariff={electricityTariff}
        onApplyTariffs={(tariffs) =>
          dispatch({ type: "SET_ENERGY_TARIFFS", ...tariffs })
        }
        isApplying={state.isEvaluating}
      />

      {/* Error display */}
      <ErrorAlert error={state.error} title="Evaluation error" />

      {/* Navigation */}
      <StepNavigation
        currentStep={1}
        totalSteps={3}
        onPrevious={handlePrevious}
        previousLabel="Back to building details"
        onPrimaryAction={handleEvaluate}
        primaryActionLabel="Compare renovation options"
        isLoading={state.isEvaluating}
        primaryDisabled={
          !canEvaluate ||
          gasTariff.isLoading ||
          electricityTariff.isLoading ||
          gasTariff.eurPerKwh === null ||
          electricityTariff.eurPerKwh === null
        }
        disabled={isEstimatingCosts}
      />
    </Stack>
  );
}
