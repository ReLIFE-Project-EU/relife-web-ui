import {
  Accordion,
  Alert,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";
import { ConceptExplainer } from "../../../components/shared/ConceptExplainer";
import { ConceptMetricCard } from "../../../components/shared/ConceptMetricCard";
import { ErrorAlert } from "../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../components/shared/MetricCard";
import type { ConceptId } from "../../../constants/relifeConcepts";
import {
  formatCurrency,
  formatDecimal,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../utils/formatters";
import { useStrategyExplorer } from "../hooks/useStrategyExplorer";
import { RSE_PACKAGES } from "../services/rsePackageCatalog";
import type {
  RSEPackageAggregate,
  RSERankingResult,
  RSERenovationGoal,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Ranking table configuration
// ─────────────────────────────────────────────────────────────────────────────

interface RankingColumn {
  key: string;
  label: string;
  formatter: (value: number) => string;
  conceptId?: ConceptId;
}

const RANKING_COLUMNS: Record<RSERenovationGoal["kind"], RankingColumn[]> = {
  financial: [
    {
      key: "renovatableBuildingsWithinBudget",
      label: "Buildings within budget",
      formatter: formatNumber,
      conceptId: "rse-renovatable-buildings",
    },
    {
      key: "aggregateROI",
      label: "Aggregate ROI",
      formatter: (v) => `${formatDecimal(v * 100)}%`,
      conceptId: "roi",
    },
    {
      key: "aggregateNPV",
      label: "Aggregate NPV",
      formatter: formatCurrency,
      conceptId: "npv",
    },
  ],
  energy: [
    {
      key: "energySavedPerEur",
      label: "kWh saved / €",
      formatter: (v) => `${formatDecimal(v)} kWh/€`,
      conceptId: "rse-energy-saved-per-eur",
    },
    {
      key: "totalAnnualEnergySavingsKwh",
      label: "Total savings",
      formatter: formatEnergy,
      conceptId: "rse-total-energy-savings",
    },
  ],
  emission: [
    {
      key: "co2ReducedTonPerEur",
      label: "t CO₂ reduced / €",
      formatter: (v) => `${formatDecimal(v)} t/€`,
      conceptId: "rse-co2-reduced-per-eur",
    },
    {
      key: "totalAnnualCo2ReductionTon",
      label: "Total CO₂ reduction",
      formatter: formatTonnageCo2,
      conceptId: "rse-total-co2-reduction",
    },
  ],
};

function getAggregateValue(
  agg: RSEPackageAggregate,
  key: string,
): number | undefined {
  switch (key) {
    case "renovatableBuildingsWithinBudget":
      return agg.renovatableBuildingsWithinBudget;
    case "aggregateROI":
      return agg.financialIndicators.aggregateROI;
    case "aggregateNPV":
      return agg.financialIndicators.aggregateNPV;
    case "energySavedPerEur":
      return agg.energySavedPerEur;
    case "totalAnnualEnergySavingsKwh":
      return agg.totalAnnualEnergySavingsKwh;
    case "co2ReducedTonPerEur":
      return agg.co2ReducedTonPerEur;
    case "totalAnnualCo2ReductionTon":
      return agg.totalAnnualCo2ReductionTon;
    default:
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

function UnavailableAlert({
  combinations,
}: {
  combinations: Array<{
    archetype: { country: string; category: string; name: string };
    packageId: string;
    reason: string;
  }>;
}) {
  return (
    <Alert
      color="red"
      icon={<IconAlertCircle size={16} />}
      title="Unavailable combinations"
    >
      <Text size="sm" mb="sm">
        The following archetype and package combinations are missing from the
        cache and have been excluded from the analysis:
      </Text>
      <Stack gap={4}>
        {combinations.map((combo, i) => (
          <Text key={i} size="sm">
            • {combo.archetype.country} / {combo.archetype.category} /{" "}
            {combo.archetype.name} —{" "}
            {RSE_PACKAGES[combo.packageId as keyof typeof RSE_PACKAGES]
              ?.label ?? combo.packageId}
          </Text>
        ))}
      </Stack>
    </Alert>
  );
}

function RankingTable({
  rankings,
  aggregates,
  goal,
}: {
  rankings: RSERankingResult[];
  aggregates: RSEPackageAggregate[];
  goal: RSERenovationGoal;
}) {
  const columns = RANKING_COLUMNS[goal.kind];
  const aggregateByPackage = new Map(aggregates.map((a) => [a.packageId, a]));

  return (
    <Card withBorder radius="md" p="lg">
      <Title order={4} mb="md">
        Package Rankings
      </Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Rank</Table.Th>
            <Table.Th>Package</Table.Th>
            <Table.Th>Score</Table.Th>
            {columns.map((col) => (
              <Table.Th key={col.key}>
                <Group gap={4} wrap="nowrap">
                  {col.label}
                  {col.conceptId && (
                    <ConceptExplainer conceptId={col.conceptId} />
                  )}
                </Group>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rankings.map((ranking) => {
            const agg = aggregateByPackage.get(ranking.packageId);
            return (
              <Table.Tr key={ranking.packageId}>
                <Table.Td>
                  <Text fw={700}>{ranking.rank}</Text>
                </Table.Td>
                <Table.Td>
                  {RSE_PACKAGES[ranking.packageId]?.label ?? ranking.packageId}
                </Table.Td>
                <Table.Td>{formatDecimal(ranking.score)}</Table.Td>
                {columns.map((col) => {
                  const value = agg
                    ? getAggregateValue(agg, col.key)
                    : undefined;
                  return (
                    <Table.Td key={col.key}>
                      {value !== undefined ? col.formatter(value) : "—"}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function PackageKpiGrid({ aggregates }: { aggregates: RSEPackageAggregate[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      {aggregates.map((agg) => (
        <Card key={agg.packageId} withBorder radius="md" p="lg">
          <Title order={5} mb="md">
            {RSE_PACKAGES[agg.packageId]?.label ?? agg.packageId}
          </Title>
          <SimpleGrid cols={2} spacing="md">
            <MetricCard
              label="Total buildings"
              value={formatNumber(agg.totalBuildings)}
            />
            <ConceptMetricCard
              conceptId="investment"
              value={formatCurrency(agg.totalCapexEur)}
            />
            <MetricCard
              label="Energy savings"
              value={formatEnergy(agg.totalAnnualEnergySavingsKwh)}
            />
            <MetricCard
              label="CO₂ reduction"
              value={formatTonnageCo2(agg.totalAnnualCo2ReductionTon)}
            />
            {agg.financialIndicators.aggregateNPV !== undefined && (
              <ConceptMetricCard
                conceptId="npv"
                value={formatCurrency(agg.financialIndicators.aggregateNPV)}
              />
            )}
            {agg.financialIndicators.aggregateROI !== undefined && (
              <ConceptMetricCard
                conceptId="roi"
                value={`${formatDecimal(agg.financialIndicators.aggregateROI * 100)}%`}
              />
            )}
          </SimpleGrid>
        </Card>
      ))}
    </SimpleGrid>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ResultsStep() {
  const { state, dispatch } = useStrategyExplorer();
  const result = state.workflowResult;

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  if (!result) {
    return (
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="xs">
            Results
          </Title>
          <Text c="dimmed">
            No results available. Please run the analysis first.
          </Text>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} mb="xs">
          Strategy Comparison Results
        </Title>
        <Text c="dimmed" size="sm">
          Ranked renovation packages based on your selected goal and portfolio.
        </Text>
      </Box>

      <ErrorAlert error={state.error} title="Analysis Error" />

      {result.unavailableCombinations.length > 0 && (
        <UnavailableAlert combinations={result.unavailableCombinations} />
      )}

      {result.rankings.length > 0 && result.request.goal && (
        <>
          <RankingTable
            rankings={result.rankings}
            aggregates={result.packageAggregates}
            goal={result.request.goal}
          />
          <PackageKpiGrid aggregates={result.packageAggregates} />
        </>
      )}

      {result.rankings.length === 0 &&
        result.unavailableCombinations.length === 0 && (
          <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
            No packages could be ranked. Please check your portfolio and package
            selections.
          </Alert>
        )}

      <Accordion variant="separated" radius="md">
        <Accordion.Item value="per-archetype">
          <Accordion.Control>
            <Text fw={600}>View per-archetype breakdown</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              {result.packageAggregates.map((agg) => (
                <Box key={agg.packageId}>
                  <Text fw={600} mb="xs">
                    {RSE_PACKAGES[agg.packageId]?.label ?? agg.packageId}
                  </Text>
                  {agg.financialIndicators.perArchetypeOnly ? (
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Metric</Table.Th>
                          <Table.Th>Archetype</Table.Th>
                          <Table.Th>Value</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(
                          agg.financialIndicators.perArchetypeOnly,
                        ).flatMap(([metric, values]) =>
                          Object.entries(values).map(
                            ([archetypeKey, value]) => (
                              <Table.Tr key={`${metric}-${archetypeKey}`}>
                                <Table.Td>{metric}</Table.Td>
                                <Table.Td>
                                  {archetypeKey.replace(
                                    new RegExp(String.fromCharCode(0x1f), "g"),
                                    " / ",
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {metric === "IRR"
                                    ? `${formatDecimal((value as number) * 100)}%`
                                    : `${formatDecimal(value as number)} years`}
                                </Table.Td>
                              </Table.Tr>
                            ),
                          ),
                        )}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No per-archetype metrics available.
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group justify="flex-start">
        <Button onClick={handleReset} variant="default">
          Start Over
        </Button>
      </Group>
    </Stack>
  );
}
