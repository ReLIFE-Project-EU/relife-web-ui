/**
 * ResultsStep Component
 * Screen 3: Shows comparison results and decision support.
 */

import { Alert, Box, Stack, Text, Title } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import {
  DecisionSupport,
  FinancialDataSection,
  MeasuresList,
  ScenarioComparison,
} from "../results";
import { ErrorAlert, StepNavigation } from "../shared";

export function ResultsStep() {
  const { state, dispatch } = useHomeAssistant();

  const handlePrevious = () => {
    dispatch({ type: "PREV_STEP" });
  };

  // Redirect to step 2 if no evaluation data
  if (state.scenarios.length === 0) {
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
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Results & Decision Support
        </Title>
        <Text c="dimmed" size="sm">
          Compare renovation scenarios and find the best option for your needs.
        </Text>
      </Box>

      {/* Scenario Comparison Table */}
      <ScenarioComparison />

      {/* Financial Data Section */}
      <FinancialDataSection />

      {/* Measures List */}
      <MeasuresList />

      {/* Decision Support (MCDA Ranking) */}
      <DecisionSupport />

      {/* Error display */}
      <ErrorAlert error={state.error} />

      {/* Navigation - only back button on final step */}
      <StepNavigation
        currentStep={2}
        totalSteps={3}
        onPrevious={handlePrevious}
      />
    </Stack>
  );
}
