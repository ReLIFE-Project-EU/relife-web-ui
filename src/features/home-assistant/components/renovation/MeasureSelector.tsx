/**
 * MeasureSelector Component
 * Displays renovation measures grouped by category with multi-select capability.
 */

import {
  Alert,
  Box,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { pvKwpFromFloorArea } from "../../../../services/pvConfig";
import type { RenovationMeasureId } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { MeasureCard } from "./MeasureCard";

export function MeasureSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();

  const categories = renovation.getCategories();
  const selectedMeasures = state.renovation.selectedMeasures;
  const hasHeatPump = selectedMeasures.includes("air-water-heat-pump");
  const hasBoiler = selectedMeasures.includes("condensing-boiler");
  const hasPv = selectedMeasures.includes("pv");
  const pvKwp = pvKwpFromFloorArea(state.building.floorArea);

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
                  const isSelected = selectedMeasures.includes(measure.id);
                  const mutuallyExclusiveDisabled =
                    !isSelected &&
                    ((measure.id === "condensing-boiler" && hasHeatPump) ||
                      (measure.id === "air-water-heat-pump" && hasBoiler));
                  const displayMeasure = isAnalysisEligible
                    ? { ...measure, isSupported: true }
                    : measure;

                  return (
                    <Tooltip
                      key={measure.id}
                      label="Mutually exclusive with the selected heating system"
                      disabled={!mutuallyExclusiveDisabled}
                      multiline
                    >
                      <Box>
                        <MeasureCard
                          measure={displayMeasure}
                          isSelected={isSelected}
                          onToggle={handleToggleMeasure}
                          disabled={
                            !isAnalysisEligible || mutuallyExclusiveDisabled
                          }
                        />
                      </Box>
                    </Tooltip>
                  );
                })}
              </SimpleGrid>
            </Box>
          );
        })}
      </Stack>

      {hasPv && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          mt="lg"
          title="About PV assumptions"
        >
          {pvKwp !== null && state.building.floorArea !== null ? (
            <>
              We estimate solar production from your floor area using a typical
              south-facing roof setup.{" "}
              {/* The API uses archetype-basis sizing; this shows the user-equivalent size. */}
              For your building, this is roughly{" "}
              <Text span inherit fw={700}>
                {pvKwp.toFixed(1)} kWp
              </Text>
              . Real output depends on roof direction, shade, and available
              space. The cost comparison currently counts self-consumed
              electricity only.
            </>
          ) : (
            <>
              We estimate solar production from floor area using a typical
              south-facing roof setup. Enter a valid floor area to include PV in
              the comparison.
            </>
          )}
        </Alert>
      )}

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
