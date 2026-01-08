/**
 * OpeningsInputs Component
 * Provides number of openings and glazing technology inputs.
 */

import { NumberInput, Select, SimpleGrid } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

export function OpeningsInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();
  const options = building.getOptions();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <NumberInput
        label="Insert number of openings"
        description="Count of windows and glass doors."
        placeholder="Number of windows/doors"
        min={1}
        max={50}
        value={state.building.numberOfOpenings ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "numberOfOpenings",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      <Select
        label="Select glazing technology"
        description="Select the type of windows installed in the building."
        placeholder="Type of windows"
        data={options.glazingTechnologies}
        value={state.building.glazingTechnology}
        onChange={(value) =>
          value &&
          dispatch({
            type: "UPDATE_BUILDING",
            field: "glazingTechnology",
            value,
          })
        }
        required
        allowDeselect={false}
      />
    </SimpleGrid>
  );
}
