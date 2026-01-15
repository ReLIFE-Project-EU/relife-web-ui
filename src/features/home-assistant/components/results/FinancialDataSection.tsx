/**
 * FinancialDataSection Component
 * Displays financial metrics for renovation scenarios using card-based layout.
 *
 * Features:
 * - Primary metrics with percentile range visualization (when available)
 * - Success probability gauge
 * - Expandable secondary metrics section
 * - Scenario comparison support
 */

import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Card,
  Collapse,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { CashFlowChart } from "./CashFlowChart";
import { FinancialMetricCard } from "./FinancialMetricCard";
import { RiskGauge } from "./RiskGauge";
import { MetricExplainer } from "../shared/MetricExplainer";
import type {
  CashFlowData,
  FinancialResults,
  PercentileData,
  ScenarioId,
} from "../../context/types";
import {
  formatCurrency,
  formatPercent,
  formatYears,
} from "../../utils/formatters";
import { getScenarioColor } from "../../utils/colorUtils";

export function FinancialDataSection() {
  const { state } = useHomeAssistant();
  const { scenarios, financialResults, funding } = state;
  const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(false);

  const renovationScenarios = scenarios.filter((s) => s.id !== "current");
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ScenarioId | null>(renovationScenarios[0]?.id ?? null);

  // Ensure selected scenario is valid
  const effectiveScenarioId =
    (selectedScenarioId &&
      renovationScenarios.some((s) => s.id === selectedScenarioId) &&
      selectedScenarioId) ||
    renovationScenarios[0]?.id ||
    null;

  // Funding option labels for display
  const enabledFunding: string[] = [];
  if (funding.financingType === "loan") {
    enabledFunding.push("Loan");
  } else {
    enabledFunding.push("Self-funded");
  }

  const selectedResult =
    effectiveScenarioId && financialResults[effectiveScenarioId]
      ? financialResults[effectiveScenarioId]
      : undefined;

  const cashFlowData: CashFlowData | undefined =
    selectedResult?.riskAssessment?.cashFlowData ??
    (selectedResult?.riskAssessment?.metadata.cash_flow_data as
      | CashFlowData
      | undefined);

  const cashFlowVisualization =
    selectedResult?.riskAssessment?.cashFlowVisualization;

  const percentiles = selectedResult?.riskAssessment?.percentiles;
  // Only use n_sims if API returns it - never hardcode

  if (renovationScenarios.length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg" bg="gray.0">
      <Stack gap="lg">
        {/* Header */}
        <Box
          p="md"
          style={{
            backgroundColor: "var(--mantine-color-dark-6)",
            borderRadius: "var(--mantine-radius-sm)",
            marginLeft: -16,
            marginRight: -16,
            marginTop: -16,
          }}
        >
          <Title order={4} c="white">
            Financial Overview
          </Title>
        </Box>

        {/* Funding Options Display */}
        <Group justify="space-between" align="center">
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Applied Funding Options
            </Text>
            <Group gap="xs">
              {enabledFunding.length > 0 ? (
                enabledFunding.map((option) => (
                  <Badge key={option} variant="light" color="blue">
                    {option}
                  </Badge>
                ))
              ) : (
                <Badge variant="light" color="gray">
                  No funding applied
                </Badge>
              )}
            </Group>
          </Box>

          {/* Scenario Selector (when multiple scenarios) */}
          {renovationScenarios.length > 1 && (
            <SegmentedControl
              value={effectiveScenarioId ?? undefined}
              onChange={(value) => setSelectedScenarioId(value as ScenarioId)}
              data={renovationScenarios.map((scenario) => ({
                label: scenario.label,
                value: scenario.id,
              }))}
            />
          )}
        </Group>

        {/* Scenario Badge (single scenario indicator) */}
        {renovationScenarios.length === 1 && effectiveScenarioId && (
          <Group gap="xs">
            <Box
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: `var(--mantine-color-${getScenarioColor(effectiveScenarioId)}-6)`,
              }}
            />
            <Text size="sm" fw={500}>
              {renovationScenarios[0].label}
            </Text>
          </Group>
        )}

        {/* Primary Financial Metrics */}
        {selectedResult && (
          <Stack gap="md">
            <Text size="sm" fw={500}>
              Key Financial Indicators
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {/* Net Present Value */}
              <FinancialMetricCard
                label="Net Present Value"
                metricType="NPV"
                value={
                  selectedResult.riskAssessment?.pointForecasts.NPV ??
                  selectedResult.netPresentValue
                }
                formatter={formatCurrency}
                percentiles={percentiles?.NPV}
                color="blue"
                highlighted
              />

              {/* Payback Period */}
              <FinancialMetricCard
                label="Payback Period"
                metricType="PBP"
                value={
                  selectedResult.riskAssessment?.pointForecasts.PBP ??
                  selectedResult.paybackTime
                }
                formatter={formatYears}
                percentiles={percentiles?.PBP}
                color="teal"
                lowerIsBetter
              />

              {/* Monthly Savings - only show if risk assessment exists */}
              {selectedResult.riskAssessment?.pointForecasts
                .MonthlyAvgSavings !== undefined && (
                <FinancialMetricCard
                  label="Monthly Savings"
                  metricType="MonthlyAvgSavings"
                  value={
                    selectedResult.riskAssessment.pointForecasts
                      .MonthlyAvgSavings
                  }
                  formatter={formatCurrency}
                  color="green"
                />
              )}

              {/* Capital Expenditure */}
              <FinancialMetricCard
                label="Investment Required"
                metricType="CAPEX"
                value={selectedResult.capitalExpenditure}
                formatter={formatCurrency}
                color="gray"
              />
            </SimpleGrid>

            {/* Success Probability Gauge - only show if API returns SuccessRate */}
            {selectedResult.riskAssessment?.pointForecasts.SuccessRate !==
              undefined && (
              <RiskGauge
                successRate={
                  selectedResult.riskAssessment.pointForecasts.SuccessRate
                }
              />
            )}

            {/* Expandable Secondary Metrics */}
            <Card withBorder radius="md" p={0}>
              <UnstyledButton
                onClick={toggleDetails}
                p="md"
                style={{ width: "100%" }}
              >
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    {detailsOpened ? "Hide" : "Show"} Additional Metrics
                  </Text>
                  {detailsOpened ? (
                    <IconChevronUp size={18} />
                  ) : (
                    <IconChevronDown size={18} />
                  )}
                </Group>
              </UnstyledButton>

              <Collapse in={detailsOpened}>
                <Divider />
                <Box p="md">
                  <SecondaryMetricsTable
                    result={selectedResult}
                    percentiles={percentiles}
                  />
                </Box>
              </Collapse>
            </Card>
          </Stack>
        )}

        {/* Cash Flow Chart */}
        {selectedResult && (
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Cash Flow Timeline
            </Text>
            <Text size="xs" c="dimmed">
              Inflows, outflows, and net cash flow over the project lifetime.
            </Text>

            {cashFlowData ? (
              <Stack gap="xs">
                <CashFlowChart
                  data={cashFlowData}
                  projectLifetime={
                    selectedResult.riskAssessment?.metadata.project_lifetime
                  }
                />
                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconInfoCircle size={16} />}
                  radius="sm"
                >
                  Green bars are yearly savings; red bars are yearly costs (loan
                  + upkeep). The dark line shows how far ahead or behind you are
                  each year. Dashed markers point to loan payoff and, when it
                  happens, the first year the project pays for itself.
                </Alert>
                {cashFlowData.breakeven_year === null && (
                  <Card withBorder radius="sm" p="sm" bg="red.0">
                    <Text size="sm" fw={600} c="red.7">
                      This scenario does not break even within the selected
                      project horizon.
                    </Text>
                    <Text size="xs" c="red.7">
                      Inflows and savings stay below costs over the chosen
                      timeframe. Adjust project lifetime, capex, or measures to
                      reach profitability.
                    </Text>
                  </Card>
                )}
              </Stack>
            ) : cashFlowVisualization ? (
              <Card withBorder radius="md" p="md">
                <Text size="sm" c="dimmed" mb="xs">
                  Showing cash flow image from API (no structured data
                  returned).
                </Text>
                <img
                  src={cashFlowVisualization}
                  alt="Cash flow timeline"
                  style={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "contain",
                  }}
                />
              </Card>
            ) : (
              <Card withBorder radius="md" p="md">
                <Text size="sm" c="dimmed">
                  Cash flow data is not available for this scenario yet.
                </Text>
              </Card>
            )}
          </Stack>
        )}

        {/* Scenario Comparison Table (when multiple scenarios) */}
        {renovationScenarios.length > 1 && (
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Scenario Comparison
            </Text>
            <ScenarioComparisonTable
              scenarios={renovationScenarios}
              financialResults={financialResults}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

/**
 * Secondary metrics displayed in the expandable section
 */
interface SecondaryMetricsTableProps {
  result: FinancialResults;
  percentiles?: {
    IRR?: PercentileData;
    ROI?: PercentileData;
    DPP?: PercentileData;
  };
}

function SecondaryMetricsTable({
  result,
  percentiles,
}: SecondaryMetricsTableProps) {
  const cashFlowData =
    result.riskAssessment?.cashFlowData ??
    (result.riskAssessment?.metadata.cash_flow_data as
      | CashFlowData
      | undefined);

  const metrics = [
    {
      label: "Internal Rate of Return",
      metricType: "IRR" as const,
      value: (result.riskAssessment?.pointForecasts.IRR ?? 0) * 100,
      formatter: formatPercent,
      percentile: percentiles?.IRR
        ? {
            P10: percentiles.IRR.P10 * 100,
            P50: percentiles.IRR.P50 * 100,
            P90: percentiles.IRR.P90 * 100,
          }
        : undefined,
    },
    {
      label: "Return on Investment",
      metricType: "ROI" as const,
      value:
        (result.riskAssessment?.pointForecasts.ROI ??
          result.returnOnInvestment / 100) * 100,
      formatter: formatPercent,
      percentile: percentiles?.ROI
        ? {
            P10: percentiles.ROI.P10 * 100,
            P50: percentiles.ROI.P50 * 100,
            P90: percentiles.ROI.P90 * 100,
          }
        : undefined,
    },
    {
      label: "Discounted Payback Period",
      metricType: "DPP" as const,
      value: result.riskAssessment?.pointForecasts.DPP ?? 0,
      formatter: formatYears,
      percentile: percentiles?.DPP,
      lowerIsBetter: true,
    },
  ];

  return (
    <Stack gap="md">
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Metric</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Value</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>
                Range (P10 - P90)
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {metrics.map((metric) => (
              <Table.Tr key={metric.metricType}>
                <Table.Td>
                  <Group gap={6}>
                    {metric.label}
                    <MetricExplainer metric={metric.metricType} />
                  </Group>
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  <Text fw={500}>{metric.formatter(metric.value)}</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {metric.percentile ? (
                    <Text size="sm" c="dimmed">
                      {metric.formatter(metric.percentile.P10)} -{" "}
                      {metric.formatter(metric.percentile.P90)}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      -
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}

            {/* Break-even Year (special row) */}
            <Table.Tr>
              <Table.Td>
                <Group gap={6}>
                  Break-even Year
                  <MetricExplainer metric="BreakEven" />
                </Group>
              </Table.Td>
              <Table.Td style={{ textAlign: "right" }}>
                {cashFlowData?.breakeven_year === undefined ? (
                  <Badge variant="light" color="gray">
                    Not available
                  </Badge>
                ) : cashFlowData.breakeven_year === null ? (
                  <Badge variant="light" color="red">
                    No break-even
                  </Badge>
                ) : (
                  <Badge variant="light" color="green">
                    Year {cashFlowData.breakeven_year}
                  </Badge>
                )}
              </Table.Td>
              <Table.Td style={{ textAlign: "right" }}>
                <Text size="sm" c="dimmed">
                  -
                </Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}

/**
 * Comparison table for multiple scenarios
 */
interface ScenarioComparisonTableProps {
  scenarios: { id: ScenarioId; label: string }[];
  financialResults: Record<ScenarioId, FinancialResults>;
}

function ScenarioComparisonTable({
  scenarios,
  financialResults,
}: ScenarioComparisonTableProps) {
  const metrics: Array<{
    label: string;
    getValue: (fr: FinancialResults) => number | undefined;
    formatter: (value: number | undefined) => string;
  }> = [
    {
      label: "Investment",
      getValue: (fr: FinancialResults) => fr.capitalExpenditure,
      formatter: (value) => (value === undefined ? "-" : formatCurrency(value)),
    },
    {
      label: "Net Present Value",
      getValue: (fr: FinancialResults) =>
        fr.riskAssessment?.pointForecasts.NPV ?? fr.netPresentValue,
      formatter: (value) => (value === undefined ? "-" : formatCurrency(value)),
    },
    {
      label: "Payback Period",
      getValue: (fr: FinancialResults) =>
        fr.riskAssessment?.pointForecasts.PBP ?? fr.paybackTime,
      formatter: (value) => (value === undefined ? "-" : formatYears(value)),
    },
    {
      label: "Monthly Savings",
      getValue: (fr: FinancialResults) =>
        fr.riskAssessment?.pointForecasts.MonthlyAvgSavings,
      formatter: (v: number | undefined) =>
        v !== undefined ? formatCurrency(v) : "-",
    },
    {
      label: "Success Rate",
      getValue: (fr: FinancialResults) => {
        const rate = fr.riskAssessment?.pointForecasts.SuccessRate;
        return rate !== undefined ? rate * 100 : undefined;
      },
      formatter: (v: number | undefined) =>
        v !== undefined ? `${Math.round(v)}%` : "-",
    },
  ];

  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Metric</Table.Th>
            {scenarios.map((scenario) => (
              <Table.Th
                key={scenario.id}
                style={{
                  textAlign: "center",
                  backgroundColor: `var(--mantine-color-${getScenarioColor(scenario.id)}-0)`,
                }}
              >
                <Group gap={6} justify="center" align="center">
                  <Box
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: `var(--mantine-color-${getScenarioColor(scenario.id)}-6)`,
                    }}
                  />
                  <Text size="sm" fw={600}>
                    {scenario.label}
                  </Text>
                </Group>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {metrics.map((metric) => (
            <Table.Tr key={metric.label}>
              <Table.Td fw={500}>{metric.label}</Table.Td>
              {scenarios.map((scenario) => {
                const fr = financialResults[scenario.id];
                if (!fr) {
                  return (
                    <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
                      <Text size="sm" c="dimmed">
                        N/A
                      </Text>
                    </Table.Td>
                  );
                }
                return (
                  <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
                    <Text size="sm" fw={500}>
                      {metric.formatter(metric.getValue(fr))}
                    </Text>
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
