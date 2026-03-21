/**
 * PortfolioAdvisor Component
 * Main wizard container with Mantine Stepper for the Portfolio Renovation Advisor.
 */

import {
  Box,
  Button,
  Container,
  Group,
  Progress,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuilding,
  IconBolt,
  IconCash,
  IconChartBar,
  IconRefresh,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useSyncGlobalLoading } from "../../contexts/global-loading";
import { useWizardStepScroll } from "../../hooks/useWizardStepScroll";
import { PortfolioAdvisorProvider } from "./context/PortfolioAdvisorContext";
import { PortfolioAdvisorServiceProvider } from "./context/ServiceContext";
import { usePortfolioAdvisor } from "./hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "./hooks/usePortfolioAdvisorServices";
import { getPortfolioMeasureStatus } from "./utils/measureSelection";
import {
  BuildingPortfolioStep,
  EnergyRenovationStep,
  FinancingStep,
  ResultsStep,
} from "./components/steps";

/**
 * Inner component that uses the context.
 * Must be wrapped in PortfolioAdvisorProvider.
 */
function PortfolioAdvisorWizard() {
  const { state, dispatch } = usePortfolioAdvisor();
  const { renovation } = usePortfolioAdvisorServices();
  const topRef = useRef<HTMLDivElement | null>(null);

  const analysisEligibleMeasures = renovation
    .getAnalysisEligibleMeasures()
    .map((measure) => measure.id);
  const costFieldsValid =
    state.renovation.estimatedCapex !== null &&
    state.renovation.estimatedMaintenanceCost !== null;
  const { hasValidSelections } = getPortfolioMeasureStatus(
    state.buildings,
    state.renovation.selectedMeasures,
    analysisEligibleMeasures,
  );
  const canAccessFinancing = costFieldsValid && hasValidSelections;

  // Sync local loading states to the global loading overlay
  useSyncGlobalLoading(state.isEstimating, "PortfolioAdvisor.estimate");
  useSyncGlobalLoading(state.isEvaluating, "PortfolioAdvisor.evaluate");
  useSyncGlobalLoading(state.isRanking, "PortfolioAdvisor.rank");
  useWizardStepScroll(state.currentStep, topRef);

  const handleStepClick = (step: number) => {
    // Only allow going back to previous steps or staying on current
    if (step <= state.currentStep) {
      dispatch({ type: "SET_STEP", step: step as 0 | 1 | 2 | 3 });
    }
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  // Determine which steps are accessible
  const canAccessStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return state.buildings.length > 0;
      case 2:
        return canAccessFinancing;
      case 3:
        return Object.keys(state.buildingResults).length > 0;
      default:
        return false;
    }
  };

  // Analysis progress bar
  const progressPercent = state.analysisProgress
    ? Math.round(
        (state.analysisProgress.completed / state.analysisProgress.total) * 100,
      )
    : null;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} mb="xs">
              Portfolio Renovation Advisor
            </Title>
            <Text c="dimmed" size="lg">
              Professional portfolio-level renovation assessment
            </Text>
          </div>

          {/* Reset button - only show after step 1 */}
          {state.currentStep > 0 && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={16} />}
              onClick={handleReset}
              size="sm"
              disabled={state.isEvaluating}
            >
              Start Over
            </Button>
          )}
        </Group>

        {/* Analysis Progress Bar */}
        {progressPercent !== null && (
          <Progress value={progressPercent} size="sm" radius="md" animated />
        )}

        <Box ref={topRef} aria-hidden style={{ scrollMarginTop: 96 }} />
        <Stepper
          active={state.currentStep}
          onStepClick={handleStepClick}
          allowNextStepsSelect={false}
        >
          <Stepper.Step
            label="Building Portfolio"
            description="Add buildings"
            icon={<IconBuilding size={18} />}
            color={canAccessStep(0) ? "teal" : "gray"}
          >
            {state.currentStep === 0 && <BuildingPortfolioStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Energy & Renovation"
            description="Select measures"
            icon={<IconBolt size={18} />}
            color={canAccessStep(1) ? "teal" : "gray"}
          >
            {state.currentStep === 1 && <EnergyRenovationStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Financing"
            description="Configure funding"
            icon={<IconCash size={18} />}
            loading={state.isEvaluating}
            color={canAccessStep(2) ? "teal" : "gray"}
          >
            {state.currentStep === 2 && <FinancingStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Results"
            description="Portfolio analysis"
            icon={<IconChartBar size={18} />}
            color={canAccessStep(3) ? "teal" : "gray"}
          >
            {state.currentStep === 3 && <ResultsStep />}
          </Stepper.Step>
        </Stepper>
      </Stack>
    </Container>
  );
}

/**
 * Main exported component with provider wrapper.
 */
export function PortfolioAdvisor() {
  return (
    <PortfolioAdvisorServiceProvider>
      <PortfolioAdvisorProvider>
        <PortfolioAdvisorWizard />
      </PortfolioAdvisorProvider>
    </PortfolioAdvisorServiceProvider>
  );
}
