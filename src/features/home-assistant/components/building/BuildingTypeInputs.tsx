/**
 * BuildingTypeInputs Component
 * Provides building type, floor area, construction period/year, floors, and project lifetime inputs.
 *
 * Note: EPC is NOT a user input. It is calculated by the Forecasting API based on
 * building characteristics and used as input to the Financial API (/arv endpoint).
 * See: api-specs/20260108-125427/financial.json and ReLIFE_HRA_flowchart.md
 */

import {
  NumberInput,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { deriveConstructionYear } from "../../utils";
import {
  BUILDING_AREA_MAX,
  BUILDING_AREA_MIN,
  BUILDING_FLOORS_MAX,
  BUILDING_FLOORS_MIN,
  CONSTRUCTION_YEAR_MAX,
  CONSTRUCTION_YEAR_MIN,
  PROJECT_LIFETIME_MARKS,
  PROJECT_LIFETIME_MAX,
  PROJECT_LIFETIME_MIN,
} from "../../constants";

export function BuildingTypeInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();
  const options = building.getOptions();

  const isApartment = state.building.buildingType === "apartment";

  // Handle construction period change - auto-derive year
  const handleConstructionPeriodChange = (value: string | null) => {
    if (value) {
      dispatch({
        type: "UPDATE_BUILDING",
        field: "constructionPeriod",
        value,
      });
      // Auto-populate construction year from period midpoint
      const derivedYear = deriveConstructionYear(value);
      dispatch({
        type: "UPDATE_BUILDING",
        field: "constructionYear",
        value: derivedYear,
      });
    }
  };

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
        min={BUILDING_AREA_MIN}
        max={BUILDING_AREA_MAX}
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
        onChange={handleConstructionPeriodChange}
        required
        allowDeselect={false}
      />

      <NumberInput
        label="Construction year"
        description="Exact year of construction (auto-filled from period)."
        placeholder="e.g., 1985"
        min={CONSTRUCTION_YEAR_MIN}
        max={CONSTRUCTION_YEAR_MAX}
        value={state.building.constructionYear ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "constructionYear",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      <NumberInput
        label="Number of floors"
        description="Total floors in the building."
        placeholder="e.g., 5"
        min={BUILDING_FLOORS_MIN}
        max={BUILDING_FLOORS_MAX}
        value={state.building.numberOfFloors ?? ""}
        onChange={(value) =>
          dispatch({
            type: "UPDATE_BUILDING",
            field: "numberOfFloors",
            value: typeof value === "number" ? value : null,
          })
        }
        required
      />

      {isApartment && (
        <NumberInput
          label="Floor number"
          description="Which floor is your apartment on? (0 = ground floor)"
          placeholder="e.g., 2"
          min={0}
          max={(state.building.numberOfFloors ?? BUILDING_FLOORS_MAX) - 1}
          value={state.building.floorNumber ?? ""}
          onChange={(value) =>
            dispatch({
              type: "UPDATE_BUILDING",
              field: "floorNumber",
              value: typeof value === "number" ? value : null,
            })
          }
        />
      )}

      {/* Project Lifetime - full width */}
      <Stack gap="xs" style={{ gridColumn: "1 / -1" }}>
        <Text size="sm" fw={500}>
          Project evaluation horizon
        </Text>
        <Text size="xs" c="dimmed">
          How many years should be considered for financial projections? (
          {state.building.projectLifetime} years)
        </Text>
        <Slider
          min={PROJECT_LIFETIME_MIN}
          max={PROJECT_LIFETIME_MAX}
          step={1}
          value={state.building.projectLifetime}
          onChange={(value) =>
            dispatch({
              type: "UPDATE_BUILDING",
              field: "projectLifetime",
              value,
            })
          }
          marks={PROJECT_LIFETIME_MARKS}
          styles={{ markLabel: { fontSize: 10 } }}
        />
      </Stack>
    </SimpleGrid>
  );
}
