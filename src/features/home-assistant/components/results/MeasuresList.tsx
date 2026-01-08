/**
 * MeasuresList Component
 * Displays the energy efficiency measures for each renovation scenario.
 */

import {
  Box,
  Card,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { getScenarioColor } from "../../utils/colorUtils";

export function MeasuresList() {
  const { state } = useHomeAssistant();
  const { scenarios } = state;

  const renovationScenarios = scenarios.filter((s) => s.id !== "current");

  if (renovationScenarios.length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Box>
          <Title order={4} mb="xs">
            Energy Efficiency Measures
          </Title>
          <Text size="sm" c="dimmed">
            Measures included in each renovation package
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {renovationScenarios.map((scenario) => (
            <Box
              key={scenario.id}
              p="md"
              style={{
                backgroundColor: `var(--mantine-color-${getScenarioColor(scenario.id)}-0)`,
                borderRadius: "var(--mantine-radius-sm)",
                borderLeft: `3px solid var(--mantine-color-${getScenarioColor(scenario.id)}-5)`,
              }}
            >
              <Text fw={600} mb="sm" c={`${getScenarioColor(scenario.id)}.7`}>
                {scenario.label}
              </Text>

              {scenario.measures.length > 0 ? (
                <List
                  spacing="xs"
                  size="sm"
                  icon={
                    <ThemeIcon
                      color={getScenarioColor(scenario.id)}
                      size={18}
                      radius="xl"
                    >
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {scenario.measures.map((measure, index) => (
                    <List.Item key={index}>{measure}</List.Item>
                  ))}
                </List>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">
                  No measures selected
                </Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
