/**
 * MeasureSelector Component
 * Displays renovation measures grouped by category with multi-select capability.
 */

import { Alert, Box, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { pvKwpFromFloorArea } from "../../../../services/pvConfig";
import type { RenovationMeasureId } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { formatDecimal } from "../../utils/formatters";
import { RenovationMeasureGrid } from "../../../../components/shared/RenovationMeasureGrid";

export function MeasureSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();

  const selectedMeasures = state.renovation.selectedMeasures;
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

      <RenovationMeasureGrid
        categories={renovation.getCategories()}
        measures={renovation.getMeasures()}
        selectedIds={selectedMeasures}
        eligibleIds={renovation
          .getAnalysisEligibleMeasures()
          .map((measure) => measure.id)}
        onToggle={handleToggleMeasure}
      />

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
                {formatDecimal(pvKwp)} kWp
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
