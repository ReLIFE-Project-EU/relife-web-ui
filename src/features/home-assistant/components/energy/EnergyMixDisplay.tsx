/**
 * EnergyMixDisplay Component
 * Shows the breakdown of energy sources for cooling, heating, and overall.
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
import { IconBolt, IconFlame } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type { EnergyMix } from "../../context/types";
import { formatEnergy } from "../../utils/formatters";

export function EnergyMixDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  const { energyMix } = estimation;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Box>
          <Title order={4} mb="xs">
            Estimated Aggregated Energy Results
          </Title>
          <Text size="sm" c="dimmed">
            Energy source breakdown by usage type
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <EnergyMixSection
            title="Energy Mix - Cooling"
            mix={energyMix.cooling}
          />
          <EnergyMixSection
            title="Energy Mix - Heating"
            mix={energyMix.heating}
          />
          <EnergyMixSection
            title="Energy Mix - Overall"
            mix={energyMix.overall}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

interface EnergyMixSectionProps {
  title: string;
  mix: EnergyMix;
}

function EnergyMixSection({ title, mix }: EnergyMixSectionProps) {
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
          <IconBolt size={16} color="var(--mantine-color-yellow-6)" />
          <Text size="sm" c="dimmed">
            Total Electricity
          </Text>
        </Group>
        <Text size="md" fw={500} ml={24}>
          {formatEnergy(mix.electricity)}
        </Text>

        <Group gap="xs" mt="xs">
          <IconFlame size={16} color="var(--mantine-color-orange-6)" />
          <Text size="sm" c="dimmed">
            Heating Oil
          </Text>
        </Group>
        <Text size="md" fw={500} ml={24}>
          {formatEnergy(mix.heatingOil)}
        </Text>
      </Stack>
    </Box>
  );
}
