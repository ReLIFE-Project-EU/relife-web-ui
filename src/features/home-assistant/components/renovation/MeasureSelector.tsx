/**
 * MeasureSelector Component
 * Displays renovation measures grouped by category with multi-select capability.
 */

import { Alert, Box, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { modeledPvKwp } from "../../../../services/simulatedBuilding";
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
  const pvKwp = state.estimation
    ? modeledPvKwp(state.estimation.simulated)
    : null;

  const handleToggleMeasure = (measureId: RenovationMeasureId) => {
    dispatch({ type: "TOGGLE_MEASURE", measureId });
  };

  return (
    <Box>
      <Title order={4} mb="md">
        Renovation measures
      </Title>

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
        >
          {pvKwp !== null && state.building.floorArea !== null ? (
            <>
              PV size:{" "}
              {/* The API uses archetype-basis sizing; this shows the user-equivalent size. */}
              <Text span inherit fw={700}>
                {formatDecimal(pvKwp)} kWp
              </Text>
              . Savings count only solar electricity used on site.
            </>
          ) : (
            "Enter a valid floor area to include PV."
          )}
        </Alert>
      )}

      {/* Selection summary */}
      {selectedMeasures.length > 0 && (
        <Text fw={500} mt="lg">
          {selectedMeasures.length}{" "}
          {selectedMeasures.length === 1 ? "measure" : "measures"} selected
        </Text>
      )}
    </Box>
  );
}
