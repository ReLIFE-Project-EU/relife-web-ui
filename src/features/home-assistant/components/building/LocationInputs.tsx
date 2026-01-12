/**
 * LocationInputs Component
 * Provides country, climate zone, and coordinates selection.
 *
 * TBD: Consider adding a map picker or geocoding autocomplete for lat/lng
 */

import { NumberInput, Select, SimpleGrid, Text } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { MOCK_COUNTRY_COORDINATES } from "../../services/mock/constants";
import {
  COORDINATE_DECIMAL_SCALE,
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from "../../constants";

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

      // Set default coordinates for the country if not already set
      const coords = MOCK_COUNTRY_COORDINATES[value];
      if (coords && state.building.lat === null) {
        dispatch({ type: "UPDATE_BUILDING", field: "lat", value: coords.lat });
        dispatch({ type: "UPDATE_BUILDING", field: "lng", value: coords.lng });
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

      {/* TBD: Consider replacing with map picker or geocoding autocomplete */}
      <NumberInput
        label="Latitude"
        description="Geographic latitude coordinate."
        placeholder="e.g., 48.21"
        min={LATITUDE_MIN}
        max={LATITUDE_MAX}
        decimalScale={COORDINATE_DECIMAL_SCALE}
        value={state.building.lat ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "lat",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      <NumberInput
        label="Longitude"
        description="Geographic longitude coordinate."
        placeholder="e.g., 16.37"
        min={LONGITUDE_MIN}
        max={LONGITUDE_MAX}
        decimalScale={COORDINATE_DECIMAL_SCALE}
        value={state.building.lng ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "lng",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      <Text size="xs" c="dimmed" style={{ gridColumn: "1 / -1" }}>
        Coordinates are used to estimate property values. They are
        auto-populated based on country selection but can be adjusted for more
        accurate results.
      </Text>
    </SimpleGrid>
  );
}
