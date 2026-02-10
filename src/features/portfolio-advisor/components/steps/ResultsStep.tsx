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
} from "@mantine/core";
import { useMemo } from "react";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import { formatCurrency, formatDecimal } from "../../../../utils/formatters";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { BuildingAnalysisResult } from "../../context/types";

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Summary
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioSummary({
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
          label="Total CAPEX"
          value={formatCurrency(stats.totalCapex)}
          variant="highlight"
        />
        <MetricCard
          label="Avg NPV"
          value={formatCurrency(stats.avgNPV)}
          variant="highlight"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="md">
        <MetricCard
          label="Avg ROI"
          value={`${formatDecimal(stats.avgROI * 100)}%`}
        />
        <MetricCard
          label="Avg Payback Period"
          value={`${formatDecimal(stats.avgPBP)} years`}
        />
      </SimpleGrid>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Building Results Table
// ─────────────────────────────────────────────────────────────────────────────

function BuildingResultsTable({
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
            <Table.Th>EPC Before</Table.Th>
            <Table.Th>EPC After</Table.Th>
            <Table.Th>NPV (EUR)</Table.Th>
            <Table.Th>ROI (%)</Table.Th>
            <Table.Th>Payback (years)</Table.Th>
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

            return (
              <Table.Tr key={building.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {building.name}
                  </Text>
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
                    {result.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {epcBefore ? (
                    <EPCBadge epcClass={epcBefore} size="sm" />
                  ) : (
                    "-"
                  )}
                </Table.Td>
                <Table.Td>
                  {epcAfter ? <EPCBadge epcClass={epcAfter} size="sm" /> : "-"}
                </Table.Td>
                <Table.Td>
                  {isSuccess && fr
                    ? formatCurrency(fr.netPresentValue)
                    : result.status === "error"
                      ? result.error?.substring(0, 40)
                      : "-"}
                </Table.Td>
                <Table.Td>
                  {isSuccess && fr
                    ? `${formatDecimal(fr.returnOnInvestment * 100)}%`
                    : "-"}
                </Table.Td>
                <Table.Td>
                  {isSuccess && fr ? formatDecimal(fr.paybackTime) : "-"}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

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
          Review the analysis results for your building portfolio.
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
