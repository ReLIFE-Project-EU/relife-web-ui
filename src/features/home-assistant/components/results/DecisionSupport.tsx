/**
 * DecisionSupport Component
 * Provides recommendation ranking with priority profile selection.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  Fieldset,
  Group,
  Radio,
  SimpleGrid,
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
import { ConceptLabel } from "../shared";

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

  const handlePersonaChange = (value: string) => {
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
            Recommendation Ranking
          </Title>
          <Text size="sm" c="dimmed">
            Compare packages and see which ones best match your priorities
          </Text>
        </Box>

        <Fieldset legend="How recommendations are ranked">
          <Stack gap="sm">
            <ConceptLabel
              conceptId="priority-profile"
              descriptionVisible
              withExplainer={false}
            />
            <Text size="sm" c="dimmed">
              Only packages with complete energy and cost data can be ranked.
            </Text>
          </Stack>
        </Fieldset>

        {/* Persona Selection */}
        <Stack gap="md">
          <Radio.Group
            label="Priority profile"
            description="Choose what matters most before running the ranking."
            value={selectedPersona}
            onChange={handlePersonaChange}
          >
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" mt="xs">
              {personas.map((persona) => (
                <Radio.Card key={persona.id} value={persona.id} p="md">
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Box>
                      <Text size="sm" fw={600}>
                        {persona.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {persona.description}
                      </Text>
                    </Box>
                  </Group>
                </Radio.Card>
              ))}
            </SimpleGrid>
          </Radio.Group>

          <Group justify="flex-end">
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
        </Stack>

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
                              Ranking score: {(result.score * 100).toFixed(1)}%
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
