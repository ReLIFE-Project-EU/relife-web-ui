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
import { ConceptLabel } from "../shared";

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
            conceptId="flexibility-index"
            value={estimation.flexibilityIndex}
          />
          <IndexDisplay
            icon={<IconTemperature size={20} />}
            conceptId="comfort-index"
            value={estimation.comfortIndex}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

interface IndexDisplayProps {
  icon: React.ReactNode;
  conceptId: "flexibility-index" | "comfort-index";
  value: number;
}

function IndexDisplay({ icon, conceptId, value }: IndexDisplayProps) {
  const color = getIndexColor(value);

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {icon}
        <ConceptLabel conceptId={conceptId} descriptionVisible />
      </Group>
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
