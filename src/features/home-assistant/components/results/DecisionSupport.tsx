/**
 * DecisionSupport Component
 * Provides MCDA-based ranking with persona selection.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconInfoCircle,
  IconTrophy,
} from "@tabler/icons-react";
import { getRankingScenarioStatuses } from "../../../../services/TechnicalMCDAService";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { getRankColor } from "../../utils/colorUtils";

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

  const currentScenario = scenarios.find(
    (scenario) => scenario.id === "current",
  );
  const renovationScenarios = scenarios.filter((s) => s.id !== "current");
  const rankingStatuses = getRankingScenarioStatuses(
    renovationScenarios,
    financialResults,
  );
  const rankableRenovationScenarios = rankingStatuses
    .filter((status) => status.eligible)
    .map((status) => status.scenario);
  const canRank = rankableRenovationScenarios.length >= 2 && !!currentScenario;
  const rankingByScenarioId = new Map(
    (mcdaRanking ?? []).map((result) => [result.scenarioId, result]),
  );

  const personas = mcda.getPersonas();

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
        [currentScenario, ...renovationScenarios],
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
            Compare packages and see which ones best match your priorities
          </Text>
        </Box>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Select a weighting profile and run the ranking to see personalized
          recommendations. Only packages with complete energy and cost data can
          be ranked.
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
            Run Ranking
          </Button>
        </Group>

        {selectedPersonaData && (
          <Text size="sm" c="dimmed">
            {selectedPersonaData.description}
          </Text>
        )}

        {!canRank && (
          <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
            {rankingStatuses.filter((s) => s.eligible).length === 0
              ? "No packages are ready for ranking yet. Complete the energy evaluation for at least two packages to see recommendations."
              : "Add one more package with complete data to see the ranking."}
          </Alert>
        )}

        {/* Package List */}
        {rankingStatuses.length > 0 && (
          <Box>
            <Text size="sm" fw={500} mb="md">
              Your Packages
            </Text>
            <Stack gap="xs">
              {rankingStatuses.map((status) => {
                const { scenario } = status;
                const result = rankingByScenarioId.get(scenario.id);
                const isFirst = result?.rank === 1;

                return (
                  <Card
                    key={scenario.id}
                    padding="sm"
                    radius="sm"
                    withBorder
                    style={{
                      backgroundColor: result
                        ? isFirst
                          ? "var(--mantine-color-yellow-0)"
                          : "var(--mantine-color-body)"
                        : "var(--mantine-color-gray-0)",
                      borderColor: result
                        ? isFirst
                          ? "var(--mantine-color-yellow-6)"
                          : "var(--mantine-color-gray-3)"
                        : "var(--mantine-color-gray-3)",
                      borderWidth: isFirst ? 2 : 1,
                    }}
                  >
                    <Group align="flex-start" gap="md">
                      {/* Rank indicator */}
                      <Box
                        style={{
                          width: 40,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {result ? (
                          isFirst ? (
                            <IconTrophy
                              size={28}
                              color="var(--mantine-color-yellow-6)"
                            />
                          ) : (
                            <Text
                              size="xl"
                              fw={700}
                              c={getRankColor(result.rank)}
                            >
                              {result.rank}
                            </Text>
                          )
                        ) : status.eligible ? (
                          <IconCircleCheck
                            size={28}
                            color="var(--mantine-color-green-6)"
                          />
                        ) : (
                          <IconCircleDashed
                            size={28}
                            color="var(--mantine-color-gray-6)"
                          />
                        )}
                      </Box>

                      {/* Package info */}
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} size="md">
                          {scenario.label}
                        </Text>
                        {result ? (
                          <Group gap="xs" mt={4}>
                            <Text size="sm" c="dimmed">
                              Score: {(result.score * 100).toFixed(1)}%
                            </Text>
                            {isFirst && (
                              <>
                                <Text size="xs" c="dimmed">
                                  •
                                </Text>
                                <Text size="sm" c="yellow.9">
                                  Best match for your priorities
                                </Text>
                              </>
                            )}
                          </Group>
                        ) : status.eligible ? (
                          <Text size="sm" c="green.7" mt={4}>
                            Ready to rank - needs at least one more package
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed" mt={4}>
                            {status.reason}
                          </Text>
                        )}
                      </Box>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* No ranking yet message */}
        {!mcdaRanking && canRank && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Select a profile above and click Run Ranking to see personalized
            recommendations
          </Text>
        )}
      </Stack>
    </Card>
  );
}
