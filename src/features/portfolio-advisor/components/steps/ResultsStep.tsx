/**
 * ResultsStep Component
 * Step 3: Portfolio analysis results display.
 */

import {
  Badge,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { memo, useMemo } from "react";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import { MetricExplainer } from "../../../../components/shared/MetricExplainer";
import { formatCurrency, formatDecimal } from "../../../../utils/formatters";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { BuildingAnalysisResult } from "../../context/types";

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

    for (const result of successful) {
      const fr = result.financialResults;
      if (fr) {
        totalCapex += fr.capitalExpenditure;
        totalNPV += fr.netPresentValue;
        totalROI += fr.returnOnInvestment;
        totalPBP += fr.paybackTime;
        validFinancialCount++;
      }
    }

    const avgNPV = validFinancialCount > 0 ? totalNPV / validFinancialCount : 0;
    const avgROI = validFinancialCount > 0 ? totalROI / validFinancialCount : 0;
    const avgPBP = validFinancialCount > 0 ? totalPBP / validFinancialCount : 0;

    return {
      totalBuildings,
      successCount: successful.length,
      errorCount: errors.length,
      totalCapex,
      avgNPV,
      avgROI,
      avgPBP,
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
              Total Investment Required
              <MetricExplainer metric="CAPEX" />
            </Group>
          }
          value={formatCurrency(stats.totalCapex)}
          variant="highlight"
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              Avg. Net Present Value
              <MetricExplainer metric="NPV" />
            </Group>
          }
          value={formatCurrency(stats.avgNPV)}
          variant="highlight"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="md">
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              Avg. Return on Investment
              <MetricExplainer metric="ROI" />
            </Group>
          }
          value={`${formatDecimal(stats.avgROI * 100)}%`}
        />
        <MetricCard
          label={
            <Group gap={4} wrap="nowrap">
              Avg. Payback Period
              <MetricExplainer metric="PBP" />
            </Group>
          }
          value={`${formatDecimal(stats.avgPBP)} years`}
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
  buildings: Array<{ id: string; name: string }>;
  results: Record<string, BuildingAnalysisResult>;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Title order={4} mb="md">
        Building Results
      </Title>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Building</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>EPC Before Renovation</Table.Th>
            <Table.Th>EPC After Renovation</Table.Th>
            <Table.Th>
              <Group gap={4} wrap="nowrap">
                Net Present Value
                <MetricExplainer metric="NPV" />
              </Group>
            </Table.Th>
            <Table.Th>
              <Group gap={4} wrap="nowrap">
                Return on Investment
                <MetricExplainer metric="ROI" />
              </Group>
            </Table.Th>
            <Table.Th>
              <Group gap={4} wrap="nowrap">
                Payback Period
                <MetricExplainer metric="PBP" />
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
            const epcAfter = result.scenarios?.find(
              (s) => s.id === "renovated",
            )?.epcClass;
            const fr = result.financialResults;
            const noSavings =
              isSuccess &&
              fr?.riskAssessment === null &&
              !!result.scenarios?.find((s) => s.id === "renovated");

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
                    <EPCBadge epcClass={epcBefore} size="sm" showTooltip />
                  ) : (
                    "-"
                  )}
                </Table.Td>
                <Table.Td>
                  {epcAfter ? (
                    <EPCBadge epcClass={epcAfter} size="sm" showTooltip />
                  ) : (
                    "-"
                  )}
                </Table.Td>
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

      {/* Navigation */}
      <StepNavigation
        currentStep={3}
        totalSteps={4}
        onPrevious={handlePrevious}
      />
    </Stack>
  );
}
