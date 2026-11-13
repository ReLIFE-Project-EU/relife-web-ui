/**
 * HomeAssistant Component
 * Main wizard container with Mantine Stepper for the Home Renovation Assistant.
 */

import {
  Box,
  Button,
  Container,
  Group,
  Stack,
  Stepper,
  Title,
} from "@mantine/core";
import {
  IconHome,
  IconBolt,
  IconChartBar,
  IconRefresh,
} from "@tabler/icons-react";
import { useRef } from "react";
import { AnalysisProgress } from "../../components/AnalysisProgress";
import {
  useGlobalLoadingState,
  useSyncGlobalLoading,
} from "../../contexts/global-loading";
import { useWizardStepScroll } from "../../hooks/useWizardStepScroll";
import { HomeAssistantProvider } from "./context/HomeAssistantContext";
import { HomeAssistantServiceProvider } from "./context/ServiceContext";
import { useHomeAssistant } from "./hooks/useHomeAssistant";
import {
  BuildingInfoStep,
  EnergyRenovationStep,
  ResultsStep,
} from "./components/steps";

/**
 * Inner component that uses the context.
 * Must be wrapped in HomeAssistantProvider.
 */
function HomeAssistantWizard() {
  const { state, dispatch } = useHomeAssistant();
  const topRef = useRef<HTMLDivElement | null>(null);
  const { isLoading } = useGlobalLoadingState();

  // Keep workflow status active between HTTP requests
  useSyncGlobalLoading(state.isEstimating, "HomeAssistant.estimate");
  useSyncGlobalLoading(state.isEvaluating, "HomeAssistant.evaluate");
  // Re-ranking keeps the previous result on screen, so only the first run blocks.
  useSyncGlobalLoading(
    state.isRanking && state.mcdaRanking === null,
    "HomeAssistant.rank",
  );
  useWizardStepScroll(state.currentStep, topRef);

  const handleStepClick = (step: number) => {
    // Only allow going back to previous steps or staying on current
    if (!isLoading && step <= state.currentStep) {
      dispatch({ type: "SET_STEP", step: step as 0 | 1 | 2 });
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
        return state.estimation !== null;
      case 2:
        return state.scenarios.length > 0;
      default:
        return false;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Title order={1}>Home Renovation Assistant</Title>

          {/* Reset button - only show after step 1 */}
          {state.currentStep > 0 && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={16} />}
              onClick={handleReset}
              size="sm"
              disabled={isLoading}
            >
              Start over
            </Button>
          )}
        </Group>
        <Box ref={topRef} aria-hidden style={{ scrollMarginTop: 96 }} />
        <AnalysisProgress>
          <Stepper
            active={state.currentStep}
            onStepClick={handleStepClick}
            allowNextStepsSelect={false}
          >
            <Stepper.Step
              label="Building Information"
              icon={<IconHome size={18} />}
              loading={state.isEstimating}
              color={canAccessStep(0) ? "relife" : "gray"}
            >
              {state.currentStep === 0 && <BuildingInfoStep />}
            </Stepper.Step>

            <Stepper.Step
              label="Energy & Renovation"
              icon={<IconBolt size={18} />}
              loading={state.isEvaluating}
              color={canAccessStep(1) ? "relife" : "gray"}
            >
              {state.currentStep === 1 && <EnergyRenovationStep />}
            </Stepper.Step>

            <Stepper.Step
              label="Results"
              icon={<IconChartBar size={18} />}
              loading={state.isRanking}
              color={canAccessStep(2) ? "relife" : "gray"}
            >
              {state.currentStep === 2 && <ResultsStep />}
            </Stepper.Step>
          </Stepper>
        </AnalysisProgress>
      </Stack>
    </Container>
  );
}

/**
 * Main exported component with provider wrapper.
 */
export function HomeAssistant() {
  return (
    <HomeAssistantServiceProvider>
      <HomeAssistantProvider>
        <HomeAssistantWizard />
      </HomeAssistantProvider>
    </HomeAssistantServiceProvider>
  );
}
