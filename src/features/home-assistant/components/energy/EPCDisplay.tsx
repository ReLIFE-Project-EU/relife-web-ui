/**
 * EPCDisplay Component
 * Shows the estimated EPC and key energy metrics.
 */

import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import {
  formatCurrency,
  formatCurrencyDecimal,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../services/energyUtils";
import {
  ConceptMetricCard,
  EPCBadge,
  ReferenceAdjustedComparisonCard,
} from "../shared";

export function EPCDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  const floorArea = state.building.floorArea;
  const energyIntensity =
    floorArea && floorArea > 0
      ? estimation.annualEnergyNeeds / floorArea
      : undefined;
  const hasDeliveredConsumption = estimation.deliveredTotal !== undefined;

  return (
    <Stack gap="lg">
      <ReferenceAdjustedComparisonCard
        estimation={estimation}
        floorArea={floorArea ?? undefined}
      />

      <Card withBorder radius="md" p="lg">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={3} mb="xs">
                Energy Overview
              </Title>
              <Text size="sm" c="dimmed">
                Building needs and, when available, estimated system consumption
              </Text>
            </Box>

            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={500}>
                Estimated EPC
              </Text>
              <EPCBadge
                epcClass={estimation.estimatedEPC}
                size="xl"
                energyIntensity={energyIntensity}
                estimated
              />
              {energyIntensity !== undefined && (
                <Text size="xs" c="dimmed">
                  ~{Math.round(energyIntensity)} kWh/m²/y
                </Text>
              )}
            </Stack>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ConceptMetricCard
              conceptId="annual-building-thermal-needs"
              value={formatEnergyPerYear(estimation.annualEnergyNeeds)}
              descriptionVisible
            />
            <ConceptMetricCard
              conceptId="system-energy-consumption"
              value={
                hasDeliveredConsumption
                  ? formatEnergyPerYear(estimation.deliveredTotal!)
                  : "Not available"
              }
              descriptionVisible
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ConceptMetricCard
              conceptId="estimated-thermal-needs-cost"
              value={formatCurrency(estimation.annualEnergyCost)}
              descriptionVisible
            />
          </SimpleGrid>

          {!hasDeliveredConsumption && (
            <Text size="sm" c="dimmed">
              System energy consumption is not available for this simulation
              yet, so only the building thermal-needs result is shown.
            </Text>
          )}
          <Text size="xs" c="dimmed">
            This cost is a simple estimate based on{" "}
            {formatCurrencyDecimal(ENERGY_PRICE_EUR_PER_KWH)}
            /kWh and your home&apos;s thermal needs. It is not your expected
            bill.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
