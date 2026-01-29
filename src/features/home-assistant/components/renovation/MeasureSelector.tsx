/**
 * MeasureSelector Component
 * Displays renovation measures grouped by category with multi-select capability.
 *
 * NOTE: Cost estimates are not shown here. Per D3.2 design document,
 * CAPEX/costs are retrieved from the ReLIFE Database or Financial API,
 * not calculated by the frontend. However, users can optionally provide
 * their own CAPEX estimate if they have one.
 */

import {
  Alert,
  Box,
  Divider,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCurrencyEuro, IconInfoCircle } from "@tabler/icons-react";
import type { RenovationMeasureId } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { MeasureCard } from "./MeasureCard";

export function MeasureSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();

  const categories = renovation.getCategories();
  const selectedMeasures = state.renovation.selectedMeasures;
  const estimatedCapex = state.renovation.estimatedCapex;
  const estimatedMaintenanceCost = state.renovation.estimatedMaintenanceCost;

  const handleToggleMeasure = (measureId: RenovationMeasureId) => {
    dispatch({ type: "TOGGLE_MEASURE", measureId });
  };

  const handleCapexChange = (value: string | number) => {
    // Convert to number or null if empty
    const capex = typeof value === "number" ? value : null;
    dispatch({ type: "SET_ESTIMATED_CAPEX", capex });
  };

  const handleMaintenanceCostChange = (value: string | number) => {
    // Convert to number or null if empty
    const cost = typeof value === "number" ? value : null;
    dispatch({ type: "SET_ESTIMATED_MAINTENANCE_COST", cost });
  };

  return (
    <Box>
      <Title order={4} mb="xs">
        Renovation Measures
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Select the renovation actions to include in your assessment
      </Text>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={16} />}
        mb="lg"
      >
        Select one or more renovation measures to evaluate. Cost estimates and
        energy savings will be calculated based on your building
        characteristics.
      </Alert>

      <Stack gap="xl">
        {categories.map((category) => {
          const measures = renovation.getMeasuresByCategory(category.id);

          return (
            <Box key={category.id}>
              <Title order={5} tt="uppercase" c="dimmed" size="sm" mb="xs">
                {category.label}
              </Title>
              <Text size="xs" c="dimmed" mb="sm">
                {category.description}
              </Text>

              <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                {measures.map((measure) => (
                  <MeasureCard
                    key={measure.id}
                    measure={measure}
                    isSelected={selectedMeasures.includes(measure.id)}
                    onToggle={handleToggleMeasure}
                    disabled={!measure.isSupported}
                  />
                ))}
              </SimpleGrid>
            </Box>
          );
        })}
      </Stack>

      {/* Selection summary and cost inputs */}
      {selectedMeasures.length > 0 && (
        <>
          <Divider my="lg" />
          <Paper withBorder p="md" radius="md" bg="gray.0">
            <Stack gap="md">
              <Box>
                <Text size="sm" c="dimmed">
                  Selected measures
                </Text>
                <Text fw={500}>
                  {selectedMeasures.length}{" "}
                  {selectedMeasures.length === 1 ? "measure" : "measures"}{" "}
                  selected
                </Text>
              </Box>
              <Group grow align="flex-start">
                <NumberInput
                  label="Estimated CAPEX (optional)"
                  description="Total investment cost. Leave empty to use database estimate."
                  placeholder="e.g. 25000"
                  value={estimatedCapex ?? ""}
                  onChange={handleCapexChange}
                  min={0}
                  step={1000}
                  thousandSeparator=","
                  leftSection={<IconCurrencyEuro size={16} />}
                />
                <NumberInput
                  label="Annual maintenance cost (optional)"
                  description="Yearly O&M cost. Leave empty to use database estimate."
                  placeholder="e.g. 500"
                  value={estimatedMaintenanceCost ?? ""}
                  onChange={handleMaintenanceCostChange}
                  min={0}
                  step={100}
                  thousandSeparator=","
                  leftSection={<IconCurrencyEuro size={16} />}
                  suffix="/year"
                />
              </Group>
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}
