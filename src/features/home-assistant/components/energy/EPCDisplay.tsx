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
import { EPCBadge, MetricCard } from "../shared";

export function EPCDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        {/* Header with EPC badge */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={3} mb="xs">
              Estimated HVAC Energy Needs
            </Title>
            <Text size="sm" c="dimmed">
              Based on your building information
            </Text>
          </Box>

          <Stack gap={4} align="center">
            <Text size="xs" c="dimmed" fw={500}>
              Estimated EPC
            </Text>
            <EPCBadge epcClass={estimation.estimatedEPC} size="xl" />
          </Stack>
        </Group>

        {/* Energy metrics */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <MetricCard
            label="Annual HVAC energy needs"
            value={formatEnergyPerYear(estimation.annualEnergyNeeds)}
          />
          <MetricCard
            label="Cost of annual HVAC energy needs"
            value={formatCurrency(estimation.annualEnergyCost)}
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Cost estimate uses a frontend flat tariff of{" "}
          {formatCurrencyDecimal(ENERGY_PRICE_EUR_PER_KWH)}/kWh.
        </Text>
      </Stack>
    </Card>
  );
}
