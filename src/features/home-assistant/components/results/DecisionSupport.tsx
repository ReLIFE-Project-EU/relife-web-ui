/**
 * DecisionSupport Component
 * Provides MCDA-based ranking with persona selection.
 */

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconTrophy } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { getRankColor, getRankLabel } from "../../utils/colorUtils";

export function DecisionSupport() {
  const { state, dispatch } = useHomeAssistant();
  const { mcda } = useHomeAssistantServices();
  const {
    scenarios,
    financialResults,
    selectedPersona,
    mcdaRanking,
    isRanking,
  } = state;

  const renovationScenarios = scenarios.filter((s) => s.id !== "current");

  // Get available personas from service
  const personas = mcda.getPersonas();

  // Convert personas to Select options
  const personaOptions = personas.map((persona) => ({
    value: persona.id,
    label: persona.name,
    description: persona.description,
  }));

  const selectedPersonaData = personas.find((p) => p.id === selectedPersona);

  const handlePersonaChange = (value: string | null) => {
    if (value) {
      dispatch({ type: "SELECT_PERSONA", persona: value });
    }
  };

  const handleRunRanking = async () => {
    dispatch({ type: "START_RANKING" });

    try {
      const ranking = await mcda.rank(
        scenarios,
        financialResults,
        selectedPersona,
      );
      dispatch({ type: "SET_RANKING", ranking });
    } catch (error) {
      dispatch({
        type: "RANKING_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate ranking",
      });
    }
  };

  if (renovationScenarios.length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Box>
          <Title order={4} mb="xs">
            Decision Support
          </Title>
          <Text size="sm" c="dimmed">
            Rank renovation options based on your priorities
          </Text>
        </Box>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Select a profile that matches your priorities. The ranking considers
          energy efficiency, sustainability, comfort, and financial factors
          based on your profile.
        </Alert>

        {/* Persona Selection */}
        <Group align="flex-end" gap="md">
          <Select
            label="Weighting Profile"
            description="Choose what matters most to you"
            placeholder="Select a profile"
            data={personaOptions}
            value={selectedPersona}
            onChange={handlePersonaChange}
            style={{ flex: 1, maxWidth: 300 }}
            renderOption={({ option }) => (
              <Stack gap={2}>
                <Text size="sm">{option.label}</Text>
                <Text size="xs" c="dimmed">
                  {(option as (typeof personaOptions)[number]).description}
                </Text>
              </Stack>
            )}
          />

          <Button
            onClick={handleRunRanking}
            loading={isRanking}
            leftSection={<IconTrophy size={16} />}
            color="green"
          >
            Run
          </Button>
        </Group>

        {/* Persona Weights Display */}
        {selectedPersonaData && (
          <Box
            p="sm"
            style={{
              backgroundColor: "var(--mantine-color-gray-0)",
              borderRadius: "var(--mantine-radius-sm)",
            }}
          >
            <Text size="xs" c="dimmed" mb="xs">
              Priority weights for "{selectedPersonaData.name}":
            </Text>
            <Group gap="xs">
              <WeightBadge
                label="Financial"
                weight={selectedPersonaData.weights.financial}
              />
              <WeightBadge
                label="Energy"
                weight={selectedPersonaData.weights.energyEfficiency}
              />
              <WeightBadge
                label="Comfort"
                weight={selectedPersonaData.weights.userComfort}
              />
              <WeightBadge
                label="Sustainability"
                weight={selectedPersonaData.weights.sustainability}
              />
              <WeightBadge
                label="Renewables"
                weight={selectedPersonaData.weights.resIntegration}
              />
            </Group>
          </Box>
        )}

        {/* Ranking Results */}
        {mcdaRanking && mcdaRanking.length > 0 && (
          <Box>
            <Text size="sm" fw={500} mb="md">
              Ranking Results
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {mcdaRanking
                .sort((a, b) => a.rank - b.rank)
                .map((result) => {
                  const scenario = renovationScenarios.find(
                    (s) => s.id === result.scenarioId,
                  );
                  if (!scenario) return null;

                  const isFirst = result.rank === 1;

                  return (
                    <Box
                      key={result.scenarioId}
                      p="md"
                      style={{
                        backgroundColor: isFirst
                          ? "var(--mantine-color-yellow-0)"
                          : "var(--mantine-color-gray-0)",
                        borderRadius: "var(--mantine-radius-sm)",
                        border: isFirst
                          ? "2px solid var(--mantine-color-yellow-5)"
                          : "1px solid var(--mantine-color-gray-3)",
                        position: "relative",
                      }}
                    >
                      {/* Rank Badge */}
                      <Badge
                        color={getRankColor(result.rank)}
                        variant={result.rank === 1 ? "filled" : "light"}
                        size="lg"
                        style={{
                          position: "absolute",
                          top: -10,
                          right: 10,
                        }}
                      >
                        #{result.rank}
                      </Badge>

                      <Stack gap="xs" mt="sm">
                        <Text fw={600} size="lg">
                          {scenario.label}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Score: {(result.score * 100).toFixed(1)}%
                        </Text>
                        {isFirst && (
                          <Badge
                            color="yellow"
                            variant="light"
                            leftSection={<IconTrophy size={12} />}
                          >
                            {getRankLabel(result.rank)}
                          </Badge>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
            </SimpleGrid>
          </Box>
        )}

        {/* No ranking yet message */}
        {!mcdaRanking && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Select a profile and click "Run" to see personalized ranking
          </Text>
        )}
      </Stack>
    </Card>
  );
}

interface WeightBadgeProps {
  label: string;
  weight: number;
}

function WeightBadge({ label, weight }: WeightBadgeProps) {
  // Determine intensity based on weight
  const getIntensity = (w: number) => {
    if (w >= 0.3) return "filled";
    if (w >= 0.2) return "light";
    return "outline";
  };

  return (
    <Badge variant={getIntensity(weight)} color="blue" size="sm">
      {label}: {(weight * 100).toFixed(0)}%
    </Badge>
  );
}
