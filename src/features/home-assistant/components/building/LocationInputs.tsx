/**
 * LocationInputs Component
 * Provides country and climate zone selection.
 */

import { Select, SimpleGrid } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

export function LocationInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();
  const options = building.getOptions();

  const handleCountryChange = (value: string | null) => {
    if (value) {
      // Update country
      dispatch({ type: "UPDATE_BUILDING", field: "country", value });

      // Apply country-specific defaults
      const defaults = building.getDefaultsForCountry(value);
      if (Object.keys(defaults).length > 0) {
        dispatch({ type: "SET_BUILDING", building: defaults });
      }
    }
  };

  const handleClimateZoneChange = (value: string | null) => {
    if (value) {
      dispatch({ type: "UPDATE_BUILDING", field: "climateZone", value });
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      <Select
        label="Select country"
        description="Select the country where your building is located."
        placeholder="Choose a country"
        data={options.countries}
        value={state.building.country}
        onChange={handleCountryChange}
        searchable
        required
        allowDeselect={false}
      />

      <Select
        label="Select climatic zone"
        description="Choose the climatic zone that best describes your location."
        placeholder="Choose climate zone"
        data={options.climateZones}
        value={state.building.climateZone}
        onChange={handleClimateZoneChange}
        required
        allowDeselect={false}
      />
    </SimpleGrid>
  );
}
