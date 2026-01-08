/**
 * BuildingTypeInputs Component
 * Provides building type, floor area, construction period, and current EPC inputs.
 */

import { NumberInput, Select, SimpleGrid } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

export function BuildingTypeInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();
  const options = building.getOptions();

  // Convert EPC classes to Select options
  const epcOptions = [
    { value: "", label: "Not sure / Don't know" },
    ...options.epcClasses.map((epc) => ({ value: epc, label: epc })),
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      <Select
        label="Select building type"
        description="Choose the type of building you want to renovate."
        placeholder="Choose building type"
        data={options.buildingTypes}
        value={state.building.buildingType}
        onChange={(value) =>
          value &&
          dispatch({ type: "UPDATE_BUILDING", field: "buildingType", value })
        }
        required
        allowDeselect={false}
      />

      <NumberInput
        label="Insert floor area"
        description="Enter the total usable floor area of your home."
        placeholder="Floor area in m²"
        suffix=" m²"
        min={10}
        max={1000}
        value={state.building.floorArea ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "floorArea",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      <Select
        label="Select construction period"
        description="Select the period when the building was constructed."
        placeholder="When was it built?"
        data={options.constructionPeriods}
        value={state.building.constructionPeriod}
        onChange={(value) =>
          value &&
          dispatch({
            type: "UPDATE_BUILDING",
            field: "constructionPeriod",
            value,
          })
        }
        required
        allowDeselect={false}
      />

      <Select
        label="Select current EPC score (if available)"
        placeholder="Current EPC class"
        description="Select your building's current Energy Performance Certificate class."
        data={epcOptions}
        value={state.building.currentEPC ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "currentEPC",
            value: value || null,
          })
        }
        clearable
      />
    </SimpleGrid>
  );
}
