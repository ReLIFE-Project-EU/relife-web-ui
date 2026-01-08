/**
 * SystemInputs Component
 * Provides heating, cooling, and hot water technology selection.
 */

import { Select, SimpleGrid } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

export function SystemInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();
  const options = building.getOptions();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      <Select
        label="Current heating technology"
        description="Select the primary heating system currently installed."
        placeholder="Select heating system"
        data={options.heatingTechnologies}
        value={state.building.heatingTechnology}
        onChange={(value) =>
          value &&
          dispatch({
            type: "UPDATE_BUILDING",
            field: "heatingTechnology",
            value,
          })
        }
        required
        allowDeselect={false}
        searchable
      />

      <Select
        label="Current cooling technology"
        description="Select the primary cooling system currently installed."
        placeholder="Select cooling system"
        data={options.coolingTechnologies}
        value={state.building.coolingTechnology}
        onChange={(value) =>
          value &&
          dispatch({
            type: "UPDATE_BUILDING",
            field: "coolingTechnology",
            value,
          })
        }
        required
        allowDeselect={false}
      />

      <Select
        label="Hot water technology"
        description="Select the system used for domestic hot water."
        placeholder="Select hot water system"
        data={options.hotWaterTechnologies}
        value={state.building.hotWaterTechnology}
        onChange={(value) =>
          value &&
          dispatch({
            type: "UPDATE_BUILDING",
            field: "hotWaterTechnology",
            value,
          })
        }
        required
        allowDeselect={false}
      />
    </SimpleGrid>
  );
}
