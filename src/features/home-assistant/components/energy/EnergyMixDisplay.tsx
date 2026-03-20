/**
 * EnergyMixDisplay Component
 * Shows the breakdown of annual thermal demand into heating and cooling.
 *
 * Values are ideal thermal loads (Q_H, Q_C) derived directly from the
 * Forecasting API simulation. They represent the energy the building needs
 * to maintain comfort, NOT the delivered energy consumed by the HVAC system
 * (actual consumption depends on system efficiency, e.g. heat pump COP).
 */

import {
  Alert,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconFlame, IconInfoCircle, IconSnowflake } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { formatEnergyPerYear } from "../../utils/formatters";

export function EnergyMixDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  const { heatingDemand, coolingDemand, heatingCoolingNeeds } = estimation;

  if (!Number.isFinite(heatingDemand) || !Number.isFinite(coolingDemand)) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Box>
          <Title order={4} mb="xs">
            Building Thermal Needs Breakdown
          </Title>
          <Text size="sm" c="dimmed">
            Annual heating and cooling needs from the building simulation
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <DemandSection
            title="Heating Demand"
            value={heatingDemand}
            icon={<IconFlame size={16} color="var(--mantine-color-orange-6)" />}
          />
          <DemandSection
            title="Cooling Demand"
            value={coolingDemand}
            icon={
              <IconSnowflake size={16} color="var(--mantine-color-blue-5)" />
            }
          />
          <DemandSection
            title="Total HVAC Demand"
            value={heatingCoolingNeeds}
            icon={<IconFlame size={16} color="var(--mantine-color-gray-6)" />}
          />
        </SimpleGrid>

        <Alert
          icon={<IconInfoCircle size={16} />}
          color="blue"
          variant="light"
          p="sm"
        >
          <Text size="xs">
            These figures are <strong>ideal thermal loads</strong> from the
            building energy simulation — the energy the building needs to
            maintain comfort. Actual energy consumption will be higher and
            depends on your heating and cooling system efficiency. See Energy
            Overview above for system consumption when it is available.
          </Text>
        </Alert>
      </Stack>
    </Card>
  );
}

interface DemandSectionProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function DemandSection({ title, value, icon }: DemandSectionProps) {
  return (
    <Box
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Text size="sm" fw={500} mb="sm">
        {title}
      </Text>
      <Stack gap="xs">
        <Group gap="xs">
          {icon}
          <Text size="sm" c="dimmed">
            Annual demand
          </Text>
        </Group>
        <Text size="md" fw={500} ml={24}>
          {formatEnergyPerYear(value)}
        </Text>
      </Stack>
    </Box>
  );
}
