/**
 * EPCDisplay Component
 * Shows the key baseline energy metrics.
 */

import { Box, Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { formatEnergyPerYear } from "../../utils/formatters";
import { ConceptMetricCard, ReferenceAdjustedComparisonCard } from "../shared";

export function EPCDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  const { thermalNeed, deliveredTotal } = estimation.baseline;

  return (
    <Stack gap="lg">
      <ReferenceAdjustedComparisonCard estimation={estimation} />

      <Card withBorder radius="md" p="lg">
        <Stack gap="lg">
          <Box>
            <Title order={3} mb="xs">
              Energy Overview
            </Title>
            <Text size="sm" c="dimmed">
              Building needs and, when available, estimated system consumption
            </Text>
          </Box>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ConceptMetricCard
              conceptId="annual-building-thermal-needs"
              value={formatEnergyPerYear(thermalNeed)}
            />
            <ConceptMetricCard
              conceptId="system-energy-consumption"
              value={
                deliveredTotal !== undefined
                  ? formatEnergyPerYear(deliveredTotal)
                  : "Not available"
              }
            />
          </SimpleGrid>

          {deliveredTotal === undefined && (
            <Text size="sm" c="dimmed">
              System energy consumption is not available for this simulation
              yet, so only the building thermal-needs result is shown.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
