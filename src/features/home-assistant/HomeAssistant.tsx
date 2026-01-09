/**
 * HomeAssistant Component
 * Main wizard container with Mantine Stepper for the Home Renovation Assistant.
 */

import {
  Container,
  Stepper,
  Title,
  Text,
  Stack,
  Button,
  Group,
} from "@mantine/core";
import {
  IconHome,
  IconBolt,
  IconChartBar,
  IconRefresh,
} from "@tabler/icons-react";
import { useSyncGlobalLoading } from "../../contexts/global-loading";
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

  // Sync local loading states to the global loading overlay
  useSyncGlobalLoading(state.isEstimating, "HomeAssistant.estimate");
  useSyncGlobalLoading(state.isEvaluating, "HomeAssistant.evaluate");
  useSyncGlobalLoading(state.isRanking, "HomeAssistant.rank");

  const handleStepClick = (step: number) => {
    // Only allow going back to previous steps or staying on current
    if (step <= state.currentStep) {
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
          <div>
            <Title order={1} mb="xs">
              Home Renovation Assistant
            </Title>
            <Text c="dimmed" size="lg">
              Your personal guide to home renovation planning
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
            >
              Start Over
            </Button>
          )}
        </Group>

        {/* Stepper */}
        <Stepper
          active={state.currentStep}
          onStepClick={handleStepClick}
          allowNextStepsSelect={false}
        >
          <Stepper.Step
            label="Building Information"
            description="Enter your building details"
            icon={<IconHome size={18} />}
            loading={state.isEstimating}
            color={canAccessStep(0) ? "blue" : "gray"}
          >
            <BuildingInfoStep />
          </Stepper.Step>

          <Stepper.Step
            label="Energy & Renovation"
            description="Review and select options"
            icon={<IconBolt size={18} />}
            loading={state.isEvaluating}
            color={canAccessStep(1) ? "blue" : "gray"}
          >
            <EnergyRenovationStep />
          </Stepper.Step>

          <Stepper.Step
            label="Results"
            description="Compare and decide"
            icon={<IconChartBar size={18} />}
            loading={state.isRanking}
            color={canAccessStep(2) ? "blue" : "gray"}
          >
            <ResultsStep />
          </Stepper.Step>
        </Stepper>
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
