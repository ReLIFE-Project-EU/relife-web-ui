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
  const { mcda, renovation } = useHomeAssistantServices();
  const {
    scenarios,
    financialResults,
    selectedPersona,
    mcdaRanking,
    isRanking,
  } = state;

  const currentScenario = scenarios.find(
    (scenario) => scenario.id === "current",
  );
  const rankableMeasureIds = new Set(
    renovation.getRankableMeasures().map((measure) => measure.id),
  );
  const renovationScenarios = scenarios.filter((s) => s.id !== "current");
  const rankableRenovationScenarios = renovationScenarios.filter((scenario) =>
    scenario.measureIds.every((measureId) => rankableMeasureIds.has(measureId)),
  );
  const canRank = rankableRenovationScenarios.length >= 2 && currentScenario;

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
      if (!currentScenario) {
        throw new Error("Missing baseline scenario for ranking");
      }

      const ranking = await mcda.rank(
        [currentScenario, ...rankableRenovationScenarios],
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
          Select a profile that matches your priorities. The ranking uses the
          Technical API over the evaluated envelope packages only. System
          upgrades and mixed envelope + system scenarios are shown in the
          comparison, but they are excluded from ranking. Some criteria
          currently use placeholder values while the live integration is still
          being expanded.
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
            disabled={!canRank}
          >
            Run
          </Button>
        </Group>

        {selectedPersonaData && (
          <Text size="sm" c="dimmed">
            {selectedPersonaData.description}
          </Text>
        )}

        {!canRank && (
          <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
            At least two evaluated envelope packages are required to run the
            ranking.
          </Alert>
        )}

        {/* Ranking Results */}
        {mcdaRanking && mcdaRanking.length > 0 && (
          <Box>
            <Text size="sm" fw={500} mb="md">
              Ranking Results
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {mcdaRanking.map((result) => {
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
            {canRank
              ? 'Select a profile and click "Run" to see personalized ranking'
              : "Evaluate more than one envelope package to enable ranking"}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
