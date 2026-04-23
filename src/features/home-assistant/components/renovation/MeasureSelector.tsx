/**
 * MeasureSelector Component
 * Displays renovation measures grouped by category with multi-select capability.
 */

import { Alert, Box, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { RenovationMeasureId } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { MeasureCard } from "./MeasureCard";

export function MeasureSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();

  const categories = renovation.getCategories();
  const selectedMeasures = state.renovation.selectedMeasures;

  const handleToggleMeasure = (measureId: RenovationMeasureId) => {
    dispatch({ type: "TOGGLE_MEASURE", measureId });
  };

  return (
    <Box>
      <Title order={4} mb="xs">
        Renovation Measures
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Select the renovation actions to include in your assessment
      </Text>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={16} />}
        mb="lg"
      >
        Select one or more measures to compare. Envelope measures can be grouped
        into packages and ranked later. Heat pump and condensing boiler options
        can also be compared, on their own or with envelope measures, but they
        are not included in that ranking. You will enter package costs in the
        next section.
      </Alert>

      <Stack gap="xl">
        {categories.map((category) => {
          const measures = renovation.getMeasuresByCategory(category.id);

          return (
            <Box key={category.id}>
              <Title order={5} tt="uppercase" c="dimmed" size="sm" mb="xs">
                {category.label}
              </Title>
              <Text size="xs" c="dimmed" mb="sm">
                {category.description}
              </Text>

              <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                {measures.map((measure) => {
                  const isAnalysisEligible =
                    renovation.isAnalysisEligibleMeasure(measure.id);
                  const displayMeasure = isAnalysisEligible
                    ? { ...measure, isSupported: true }
                    : measure;

                  return (
                    <MeasureCard
                      key={measure.id}
                      measure={displayMeasure}
                      isSelected={selectedMeasures.includes(measure.id)}
                      onToggle={handleToggleMeasure}
                      disabled={!isAnalysisEligible}
                    />
                  );
                })}
              </SimpleGrid>
            </Box>
          );
        })}
      </Stack>

      {/* Selection summary */}
      {selectedMeasures.length > 0 && (
        <>
          <Box mt="lg">
            <Text size="sm" c="dimmed">
              Selected measures
            </Text>
            <Text fw={500}>
              {selectedMeasures.length}{" "}
              {selectedMeasures.length === 1 ? "measure" : "measures"} selected
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
