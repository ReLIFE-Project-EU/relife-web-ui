/**
 * PortfolioAdvisor Component
 * Main wizard container with Mantine Stepper for the Portfolio Renovation Advisor.
 */

import {
  Container,
  Stepper,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Progress,
} from "@mantine/core";
import {
  IconBuilding,
  IconBolt,
  IconCash,
  IconChartBar,
  IconRefresh,
} from "@tabler/icons-react";
import { useSyncGlobalLoading } from "../../contexts/global-loading";
import { PortfolioAdvisorProvider } from "./context/PortfolioAdvisorContext";
import { PortfolioAdvisorServiceProvider } from "./context/ServiceContext";
import { usePortfolioAdvisor } from "./hooks/usePortfolioAdvisor";
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

  // Sync local loading states to the global loading overlay
  useSyncGlobalLoading(state.isEstimating, "PortfolioAdvisor.estimate");
  useSyncGlobalLoading(state.isEvaluating, "PortfolioAdvisor.evaluate");
  useSyncGlobalLoading(state.isRanking, "PortfolioAdvisor.rank");

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
        return state.renovation.selectedMeasures.length > 0;
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

        {/* Stepper */}
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
