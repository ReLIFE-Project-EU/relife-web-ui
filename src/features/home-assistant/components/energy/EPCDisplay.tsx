/**
 * EPCDisplay Component
 * Shows the estimated EPC and key energy metrics.
 */

import {
  Alert,
  ActionIcon,
  Box,
  Card,
  Group,
  HoverCard,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import {
  formatCurrency,
  formatCurrencyDecimal,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../services/energyUtils";
import {
  EPCBadge,
  MetricCard,
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

          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">
              <strong>Building thermal needs</strong> show how much heating and
              cooling the home needs. <strong>System energy consumption</strong>{" "}
              shows the electricity or fuel needed to deliver it.
            </Text>
          </Alert>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <MetricCard
              label={
                <MetricLabel
                  label="Building thermal needs"
                  description="Annual heating and cooling needed for comfort. This comes from the building simulation, not from the HVAC system."
                />
              }
              value={formatEnergyPerYear(estimation.annualEnergyNeeds)}
            />
            <MetricCard
              label={
                <MetricLabel
                  label="Estimated system energy consumption"
                  description="Annual electricity or fuel use from the backend UNI/TS 11300 system simulation, scaled to your home's area. Envelope measures lower it by reducing heating/cooling needs. Boiler and heat-pump measures lower it by meeting those needs more efficiently."
                />
              }
              value={
                hasDeliveredConsumption
                  ? formatEnergyPerYear(estimation.deliveredTotal!)
                  : "Not available"
              }
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <MetricCard
              label="Estimated cost of thermal needs"
              value={formatCurrency(estimation.annualEnergyCost)}
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

function MetricLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text inherit>{label}</Text>
      <HoverCard width={240} shadow="md" position="top" withArrow>
        <HoverCard.Target>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            aria-label={`Explain ${label.toLowerCase()}`}
          >
            <IconInfoCircle size={14} />
          </ActionIcon>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text size="xs">{description}</Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </Group>
  );
}
