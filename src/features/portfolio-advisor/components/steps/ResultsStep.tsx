/**
 * ResultsStep Component
 * Step 3: Portfolio analysis results display.
 */

import {
  Badge,
  Box,
  Card,
  Group,
  List,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconShieldCheck } from "@tabler/icons-react";
import { memo, useMemo } from "react";
import { ConceptLabel } from "../../../../components/shared/ConceptLabel";
import {
  relifeConcepts,
  type ConceptId,
} from "../../../../constants/relifeConcepts";
import { DeltaBadge } from "../../../../components/shared/DeltaValue";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import {
  calculatePercentChange,
  formatCurrency,
  formatDecimal,
  formatEnergyPerYear,
} from "../../../../utils/formatters";
import { getEPCImprovement } from "../../../../utils/epcUtils";
import { formatArchetypeName } from "../../../../utils/archetypeLabels";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../../../services/energyUtils";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { BuildingAnalysisResult } from "../../context/types";

function ConceptSentence(conceptId: ConceptId) {
  const concept = relifeConcepts[conceptId];
  return `${concept.description}${concept.caveat ? ` ${concept.caveat}` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Summary
// ─────────────────────────────────────────────────────────────────────────────

const PortfolioSummary = memo(function PortfolioSummary({
  results,
  totalBuildings,
}: {
  results: Record<string, BuildingAnalysisResult>;
  totalBuildings: number;
}) {
  const stats = useMemo(() => {
    const entries = Object.values(results);
    const successful = entries.filter((r) => r.status === "success");
    const errors = entries.filter((r) => r.status === "error");

    let totalCapex = 0;
    let totalNPV = 0;
    let totalROI = 0;
    let totalPBP = 0;
    let validFinancialCount = 0;

    let totalEnergyReduction = 0;
    let validEnergyCount = 0;
    let totalEPCImprovement = 0;
    let validEPCCount = 0;

    for (const result of successful) {
      const fr = result.financialResults;
      if (fr) {
        totalCapex += fr.capitalExpenditure;
        totalNPV += fr.netPresentValue;
        totalROI += fr.returnOnInvestment;
        totalPBP += fr.paybackTime;
        validFinancialCount++;
      }

      const energyBefore = result.estimation?.annualEnergyNeeds;
      const renovated = result.scenarios?.find((s) => s.id === "renovated");
      const energyAfter = renovated?.annualEnergyNeeds;

      if (
        energyBefore !== undefined &&
        energyAfter !== undefined &&
        energyBefore > 0
      ) {
        totalEnergyReduction += calculatePercentChange(
          energyBefore,
          energyAfter,
        );
        validEnergyCount++;
      }

      const epcBefore = result.estimation?.estimatedEPC;
      const epcAfter = renovated?.epcClass;
      if (epcBefore && epcAfter) {
        totalEPCImprovement += getEPCImprovement(epcBefore, epcAfter);
        validEPCCount++;
      }
    }

    const avgNPV = validFinancialCount > 0 ? totalNPV / validFinancialCount : 0;
    const avgROI = validFinancialCount > 0 ? totalROI / validFinancialCount : 0;
    const avgPBP = validFinancialCount > 0 ? totalPBP / validFinancialCount : 0;
    const avgEnergyReduction =
      validEnergyCount > 0 ? totalEnergyReduction / validEnergyCount : null;
    const avgEPCImprovement =
      validEPCCount > 0 ? totalEPCImprovement / validEPCCount : null;

    return {
      totalBuildings,
      successCount: successful.length,
      errorCount: errors.length,
      totalCapex,
      avgNPV,
      avgROI,
      avgPBP,
      avgEnergyReduction,
      avgEPCImprovement,
    };
  }, [results, totalBuildings]);

  return (
    <Card withBorder radius="md" p="lg">
      <Title order={4} mb="md">
        Portfolio Summary
      </Title>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <MetricCard label="Total Buildings" value={stats.totalBuildings} />
        <MetricCard
          label="Successfully Analyzed"
          value={
            <Group gap={4}>
              <Text size="lg" fw={600} c="green">
                {stats.successCount}
              </Text>
              {stats.errorCount > 0 && (
                <Badge color="red" size="sm" variant="light">
                  {stats.errorCount} errors
                </Badge>
              )}
            </Group>
          }
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Total
              </Text>
              <ConceptLabel conceptId="investment" size="xs" />
            </Group>
          }
          value={formatCurrency(stats.totalCapex)}
          variant="highlight"
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Avg.
              </Text>
              <ConceptLabel conceptId="npv" size="xs" />
            </Group>
          }
          value={formatCurrency(stats.avgNPV)}
          variant="highlight"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Avg.
              </Text>
              <ConceptLabel conceptId="roi" size="xs" />
            </Group>
          }
          value={`${formatDecimal(stats.avgROI * 100)}%`}
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Avg.
              </Text>
              <ConceptLabel conceptId="payback-period" size="xs" />
            </Group>
          }
          value={`${formatDecimal(stats.avgPBP)} years`}
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Avg. reduction in
              </Text>
              <ConceptLabel
                conceptId="annual-building-thermal-needs"
                size="xs"
              />
            </Group>
          }
          value={
            stats.avgEnergyReduction !== null
              ? `${formatDecimal(stats.avgEnergyReduction)}%`
              : "-"
          }
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              <Text span size="xs" c="dimmed">
                Avg. improvement in
              </Text>
              <ConceptLabel conceptId="estimated-epc" size="xs" />
            </Group>
          }
          value={
            stats.avgEPCImprovement !== null
              ? `${stats.avgEPCImprovement > 0 ? "+" : ""}${formatDecimal(stats.avgEPCImprovement)} classes`
              : "-"
          }
        />
      </SimpleGrid>
    </Card>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Building Results Table
// ─────────────────────────────────────────────────────────────────────────────

const BuildingResultsTable = memo(function BuildingResultsTable({
  buildings,
  results,
}: {
  buildings: Array<{
    id: string;
    name: string;
    floorArea: number;
    archetypeName?: string;
  }>;
  results: Record<string, BuildingAnalysisResult>;
}) {
  const showDeliveredEnergyColumn = buildings.some((building) => {
    const result = results[building.id];
    const renovated = result?.scenarios?.find((s) => s.id === "renovated");

    return (
      result?.estimation?.deliveredTotal !== undefined ||
      renovated?.deliveredTotal !== undefined
    );
  });

  return (
    <Card withBorder radius="md" p="lg">
      <Title order={4} mb="md">
        Building Results
      </Title>

      <Table.ScrollContainer minWidth={1100}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Building</Table.Th>
              <Table.Th>Matched Archetype</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <ConceptLabel conceptId="estimated-epc" size="xs" />
                  <Text span size="xs" c="dimmed">
                    before renovation
                  </Text>
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <ConceptLabel conceptId="estimated-epc" size="xs" />
                  <Text span size="xs" c="dimmed">
                    after renovation
                  </Text>
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <Text span size="xs" c="dimmed">
                    Reduction in
                  </Text>
                  <ConceptLabel
                    conceptId="annual-building-thermal-needs"
                    size="xs"
                  />
                </Group>
              </Table.Th>
              {showDeliveredEnergyColumn && (
                <Table.Th>
                  <ConceptLabel
                    conceptId="system-energy-consumption"
                    size="xs"
                  />
                </Table.Th>
              )}
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <ConceptLabel conceptId="npv" size="xs" />
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <ConceptLabel conceptId="roi" size="xs" />
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <ConceptLabel conceptId="payback-period" size="xs" />
                </Group>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {buildings.map((building) => {
              const result = results[building.id];
              if (!result) return null;

              const isSuccess = result.status === "success";
              const epcBefore = result.estimation?.estimatedEPC;
              const renovated = result.scenarios?.find(
                (s) => s.id === "renovated",
              );
              const epcAfter = renovated?.epcClass;
              const fr = result.financialResults;
              const noSavings =
                isSuccess && fr?.riskAssessment === null && !!renovated;

              const energyBefore = result.estimation?.annualEnergyNeeds;
              const energyAfter = renovated?.annualEnergyNeeds;
              const intensityBefore =
                energyBefore !== undefined && building.floorArea > 0
                  ? energyBefore / building.floorArea
                  : undefined;
              const intensityAfter =
                energyAfter !== undefined && building.floorArea > 0
                  ? energyAfter / building.floorArea
                  : undefined;
              const energyReduction =
                energyBefore !== undefined &&
                energyAfter !== undefined &&
                energyBefore > 0
                  ? calculatePercentChange(energyBefore, energyAfter)
                  : undefined;
              const deliveredBefore = result.estimation?.deliveredTotal;
              const deliveredAfter = renovated?.deliveredTotal;
              const deliveredEnergyReduction =
                deliveredBefore !== undefined &&
                deliveredAfter !== undefined &&
                deliveredBefore > 0
                  ? calculatePercentChange(deliveredBefore, deliveredAfter)
                  : undefined;

              const archetype = result.estimation?.archetype;
              const wasAutoMatched = !building.archetypeName && !!archetype;

              return (
                <Table.Tr key={building.id}>
                  <Table.Td>
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        {building.name}
                      </Text>
                      {noSavings && (
                        <Tooltip
                          label="This building's current specifications already meet the targets for the selected renovation measures. No energy savings could be computed, so financial indicators are not meaningful."
                          multiline
                          w={300}
                          position="bottom-start"
                        >
                          <Badge
                            color="yellow"
                            variant="light"
                            size="sm"
                            leftSection={<IconInfoCircle size={11} />}
                            style={{ cursor: "default" }}
                          >
                            Already at renovation target
                          </Badge>
                        </Tooltip>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    {archetype ? (
                      <Tooltip
                        label={`${archetype.category} · ${archetype.country} · ${archetype.name}`}
                        multiline
                        w={260}
                      >
                        <Stack gap={4} style={{ cursor: "default" }}>
                          <Text size="sm">
                            {formatArchetypeName(archetype.name)}
                          </Text>
                          {wasAutoMatched && (
                            <Badge color="gray" variant="light" size="xs">
                              Auto
                            </Badge>
                          )}
                        </Stack>
                      </Tooltip>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        result.status === "success"
                          ? "green"
                          : result.status === "error"
                            ? "red"
                            : "yellow"
                      }
                      size="sm"
                      variant="light"
                    >
                      {result.status === "success"
                        ? "Analyzed"
                        : result.status === "error"
                          ? "Failed"
                          : result.status === "running"
                            ? "Running"
                            : "Pending"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {epcBefore ? (
                      <Group gap="xs" wrap="nowrap">
                        <EPCBadge
                          epcClass={epcBefore}
                          size="sm"
                          energyIntensity={intensityBefore}
                          estimated
                        />
                        {intensityBefore !== undefined && (
                          <Text size="xs" c="dimmed">
                            {Math.round(intensityBefore)} kWh/m²/y
                          </Text>
                        )}
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>
                    {epcAfter ? (
                      <Group gap="xs" wrap="nowrap">
                        <EPCBadge
                          epcClass={epcAfter}
                          size="sm"
                          energyIntensity={intensityAfter}
                          estimated
                        />
                        {intensityAfter !== undefined && (
                          <Text size="xs" c="dimmed">
                            {Math.round(intensityAfter)} kWh/m²/y
                          </Text>
                        )}
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>
                    {energyReduction !== undefined ? (
                      <DeltaBadge
                        delta={energyReduction}
                        higherIsBetter={false}
                      />
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  {showDeliveredEnergyColumn && (
                    <Table.Td>
                      {deliveredAfter !== undefined ? (
                        <Stack gap={4}>
                          <Text size="sm">
                            {formatEnergyPerYear(deliveredAfter)}
                          </Text>
                          {deliveredEnergyReduction !== undefined ? (
                            <DeltaBadge
                              delta={deliveredEnergyReduction}
                              higherIsBetter={false}
                            />
                          ) : (
                            <Text size="xs" c="dimmed">
                              Baseline unavailable
                            </Text>
                          )}
                        </Stack>
                      ) : (
                        "-"
                      )}
                    </Table.Td>
                  )}
                  <Table.Td>
                    {isSuccess && fr ? (
                      <Text size="sm" c={noSavings ? "dimmed" : undefined}>
                        {formatCurrency(fr.netPresentValue)}
                      </Text>
                    ) : result.status === "error" ? (
                      result.error?.substring(0, 40)
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={noSavings ? "dimmed" : undefined}>
                      {isSuccess && fr
                        ? `${formatDecimal(fr.returnOnInvestment * 100)}%`
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={noSavings ? "dimmed" : undefined}>
                      {isSuccess && fr ? formatDecimal(fr.paybackTime) : "-"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ResultsStep() {
  const { state, dispatch } = usePortfolioAdvisor();

  const hasResults = Object.keys(state.buildingResults).length > 0;

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 2 });
  };

  if (!hasResults) {
    return (
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="xs">
            Analysis Results
          </Title>
          <Text c="dimmed">
            No results available. Please run the portfolio analysis first.
          </Text>
        </Box>
        <StepNavigation
          currentStep={3}
          totalSteps={4}
          onPrevious={handlePrevious}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Portfolio Analysis Results
        </Title>
        <Text c="dimmed" size="sm">
          Below you&apos;ll find a summary of your portfolio&apos;s renovation
          economics and a per-building breakdown of key financial outcomes.
          Thermal-needs reduction remains separate from system-energy savings,
          which drive the financial analysis when available.
        </Text>
      </Box>

      {/* Error display */}
      <ErrorAlert error={state.error} title="Analysis Error" />

      {/* Portfolio Summary */}
      <PortfolioSummary
        results={state.buildingResults}
        totalBuildings={state.buildings.length}
      />

      {/* Building Results Table */}
      <BuildingResultsTable
        buildings={state.buildings}
        results={state.buildingResults}
      />

      {/* Data Transparency */}
      <Card withBorder radius="md" p="lg">
        <Group gap="xs" mb="sm">
          <ThemeIcon color="gray" variant="light" size="sm">
            <IconShieldCheck size={16} />
          </ThemeIcon>
          <Title order={4}>Data Transparency</Title>
        </Group>
        <List
          size="xs"
          spacing={6}
          icon={
            <ThemeIcon color="gray" variant="transparent" size="sm">
              <IconInfoCircle size={14} />
            </ThemeIcon>
          }
        >
          <List.Item>
            <Text size="xs" c="dimmed">
              <Text span size="xs" fw={500} c="dimmed">
                EPC classes
              </Text>{" "}
              — {ConceptSentence("estimated-epc")}
            </Text>
          </List.Item>
          <List.Item>
            <Text size="xs" c="dimmed">
              <Text span size="xs" fw={500} c="dimmed">
                Energy reduction
              </Text>{" "}
              — Calculated from annual building thermal needs as (after −
              before) / before. Negative values indicate lower modeled heating
              and cooling needs.
            </Text>
          </List.Item>
          <List.Item>
            <Text size="xs" c="dimmed">
              <Text span size="xs" fw={500} c="dimmed">
                System energy consumption
              </Text>{" "}
              — {ConceptSentence("system-energy-consumption")} Financial savings
              are based on reductions in this value when available.
            </Text>
          </List.Item>
          <List.Item>
            <Text size="xs" c="dimmed">
              <Text span size="xs" fw={500} c="dimmed">
                Energy costs
              </Text>{" "}
              — Use a flat tariff of EUR {ENERGY_PRICE_EUR_PER_KWH}/kWh
              (platform assumption, not country-specific).
            </Text>
          </List.Item>
          <List.Item>
            <Text size="xs" c="dimmed">
              <Text span size="xs" fw={500} c="dimmed">
                Financial indicators
              </Text>{" "}
              (NPV, ROI, payback period) — Computed by the Financial Service
              using Monte Carlo simulation.
            </Text>
          </List.Item>
        </List>
      </Card>

      {/* Navigation */}
      <StepNavigation
        currentStep={3}
        totalSteps={4}
        onPrevious={handlePrevious}
      />
    </Stack>
  );
}
