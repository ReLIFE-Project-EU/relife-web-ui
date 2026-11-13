/**
 * EPCDisplay Component
 * Shows the key baseline energy metrics.
 */

import { Card, SimpleGrid, Stack, Title } from "@mantine/core";
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
          <Title order={3}>Energy overview</Title>

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
        </Stack>
      </Card>
    </Stack>
  );
}
