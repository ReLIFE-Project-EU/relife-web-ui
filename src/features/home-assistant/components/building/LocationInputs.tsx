/**
 * LocationInputs Component
 * Provides coordinates for archetype matching and weather data.
 * Country is derived from the matched archetype, not user input.
 */

import { SimpleGrid, Text, TextInput } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from "../../constants";

export function LocationInputs() {
  const { state, dispatch } = useHomeAssistant();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <TextInput
        label="Latitude"
        description="Geographic latitude coordinate (for weather data & archetype matching)."
        placeholder="e.g., 48.21"
        type="number"
        step="any"
        value={state.building.lat?.toString() ?? ""}
        onChange={(e) => {
          const value = e.currentTarget.value;
          const num = parseFloat(value);
          dispatch({
            type: "UPDATE_BUILDING",
            field: "lat",
            value: value === "" || isNaN(num) ? null : num,
          });
        }}
        required
        error={
          state.building.lat !== null &&
          (state.building.lat < LATITUDE_MIN ||
            state.building.lat > LATITUDE_MAX)
            ? `Must be between ${LATITUDE_MIN} and ${LATITUDE_MAX}`
            : undefined
        }
      />

      <TextInput
        label="Longitude"
        description="Geographic longitude coordinate (for weather data & archetype matching)."
        placeholder="e.g., 16.37"
        type="number"
        step="any"
        value={state.building.lng?.toString() ?? ""}
        onChange={(e) => {
          const value = e.currentTarget.value;
          const num = parseFloat(value);
          dispatch({
            type: "UPDATE_BUILDING",
            field: "lng",
            value: value === "" || isNaN(num) ? null : num,
          });
        }}
        required
        error={
          state.building.lng !== null &&
          (state.building.lng < LONGITUDE_MIN ||
            state.building.lng > LONGITUDE_MAX)
            ? `Must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}`
            : undefined
        }
      />

      <Text size="xs" c="dimmed" style={{ gridColumn: "1 / -1" }}>
        Enter your building's coordinates. The system will automatically find the
        nearest archetype based on location.
      </Text>
    </SimpleGrid>
  );
}
