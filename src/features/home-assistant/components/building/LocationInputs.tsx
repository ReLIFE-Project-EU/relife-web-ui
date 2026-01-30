/**
 * LocationInputs Component
 * Provides coordinates for archetype matching and weather data.
 * Features an interactive map for easy location selection.
 */

import { useEffect, useState } from "react";
import {
  SimpleGrid,
  Text,
  TextInput,
  Stack,
  Collapse,
  Button,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from "../../constants";
import { LocationMap } from "./LocationMap";
import type { ArchetypeInfo } from "../../../../types/forecasting";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

export function LocationInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();

  const [archetypes, setArchetypes] = useState<ArchetypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualInputs, setShowManualInputs] = useState(false);

  // Fetch archetypes for map markers
  useEffect(() => {
    async function loadArchetypes() {
      try {
        const data = await building.getArchetypes();
        setArchetypes(data);
      } catch (error) {
        console.error("Failed to load archetypes for map:", error);
      } finally {
        setLoading(false);
      }
    }
    loadArchetypes();
  }, [building]);

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    // Round to 4 decimal places for cleaner values
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;

    dispatch({
      type: "UPDATE_BUILDING",
      field: "lat",
      value: roundedLat,
    });
    dispatch({
      type: "UPDATE_BUILDING",
      field: "lng",
      value: roundedLng,
    });
  };

  return (
    <Stack gap="md">
      {/* Interactive Map */}
      <div>
        <Text size="sm" fw={500} mb={4}>
          Click on the map to set your building location
        </Text>
        <Text size="xs" c="dimmed" mb="xs">
          Red markers show available reference building locations. Click
          anywhere to place your building.
        </Text>
        <LocationMap
          lat={state.building.lat}
          lng={state.building.lng}
          onLocationChange={handleMapClick}
          archetypes={archetypes}
          matchedArchetype={state.building.selectedArchetype}
          loading={loading}
        />
      </div>

      {/* Current coordinates display */}
      {state.building.lat !== null && state.building.lng !== null && (
        <Text size="sm" c="dimmed">
          Selected coordinates:{" "}
          <Text span fw={500} c="dark">
            {state.building.lat.toFixed(4)}, {state.building.lng.toFixed(4)}
          </Text>
        </Text>
      )}

      {/* Manual input toggle */}
      <Button
        variant="subtle"
        size="xs"
        onClick={() => setShowManualInputs(!showManualInputs)}
        leftSection={
          showManualInputs ? (
            <IconChevronUp size={14} />
          ) : (
            <IconChevronDown size={14} />
          )
        }
      >
        {showManualInputs ? "Hide" : "Show"} manual coordinate input
      </Button>

      {/* Manual text inputs (collapsible) */}
      <Collapse in={showManualInputs}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Latitude"
            description="Enter manually if you know exact coordinates."
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
            description="Enter manually if you know exact coordinates."
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
            error={
              state.building.lng !== null &&
              (state.building.lng < LONGITUDE_MIN ||
                state.building.lng > LONGITUDE_MAX)
                ? `Must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}`
                : undefined
            }
          />
        </SimpleGrid>
      </Collapse>
    </Stack>
  );
}
