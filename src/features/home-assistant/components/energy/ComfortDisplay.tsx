/**
 * ComfortDisplay Component
 * Shows flexibility and comfort indices.
 */

import {
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAdjustments, IconTemperature } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { getIndexColor } from "../../utils/colorUtils";

export function ComfortDisplay() {
  const { state } = useHomeAssistant();
  const estimation = state.estimation;

  if (!estimation) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={4}>Flexibility and Comfort</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <IndexDisplay
            icon={<IconAdjustments size={20} />}
            label="Flexibility Index"
            description="Energy flexibility potential for demand response"
            value={estimation.flexibilityIndex}
          />
          <IndexDisplay
            icon={<IconTemperature size={20} />}
            label="Comfort Index"
            description="Indoor thermal comfort level"
            value={estimation.comfortIndex}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

interface IndexDisplayProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number;
}

function IndexDisplay({ icon, label, description, value }: IndexDisplayProps) {
  const color = getIndexColor(value);

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {icon}
        <Text fw={500}>{label}</Text>
      </Group>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
      <Group gap="sm" align="center">
        <Progress
          value={value}
          color={color}
          size="lg"
          radius="xl"
          style={{ flex: 1 }}
        />
        <Text fw={600} size="lg" w={50} ta="right">
          {value}
        </Text>
      </Group>
    </Stack>
  );
}
