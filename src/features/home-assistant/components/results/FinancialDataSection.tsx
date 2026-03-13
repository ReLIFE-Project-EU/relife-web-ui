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
import {
  getEffectiveDetailScenarioId,
  hasFinancialResultForScenario,
} from "./financialSelection";
import { RiskGauge } from "./RiskGauge";
import { MetricExplainer } from "../shared";
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
  const [selectedDetailScenarioId, setSelectedDetailScenarioId] =
    useState<ScenarioId | null>(renovationScenarios[0]?.id ?? null);
  const effectiveDetailScenarioId = getEffectiveDetailScenarioId(
    renovationScenarios,
    financialResults,
    selectedDetailScenarioId,
  );
  const selectedScenario = renovationScenarios.find(
    (scenario) => scenario.id === effectiveDetailScenarioId,
  );
  const hasAnyFinancialResults = renovationScenarios.some((scenario) =>
    hasFinancialResultForScenario(financialResults, scenario.id),
  );

  // Funding option labels for display
  const enabledFunding: string[] = [];
  if (funding.financingType === "loan") {
    enabledFunding.push("Loan");
  } else {
    enabledFunding.push("Self-funded");
  }

  const selectedResult =
    selectedScenario && financialResults[selectedScenario.id]
      ? financialResults[selectedScenario.id]
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
        </Group>

        {/* Comparison-first summary */}
        {renovationScenarios.length > 1 && (
          <Stack gap="sm">
            <Box>
              <Text size="sm" fw={500}>
                Package Financial Comparison
              </Text>
              <Text size="xs" c="dimmed">
                Compare all evaluated packages below, then click any package
                column to inspect its detailed financial results and cash flow.
              </Text>
            </Box>
            <ScenarioComparisonTable
              scenarios={renovationScenarios}
              financialResults={financialResults}
              selectedScenarioId={effectiveDetailScenarioId}
              onSelectScenario={setSelectedDetailScenarioId}
            />
          </Stack>
        )}

        {!hasAnyFinancialResults && (
          <Alert color="yellow" title="Financial results unavailable">
            No package-level financial details are available for the evaluated
            packages yet.
          </Alert>
        )}

        {/* Selected package details */}
        {selectedResult && selectedScenario && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Box>
                <Text size="sm" fw={500}>
                  Selected Package Details
                </Text>
                <Text size="xs" c="dimmed">
                  Detailed financial results for {selectedScenario.label}.
                </Text>
              </Box>
              <Group gap="xs">
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: `var(--mantine-color-${getScenarioColor(selectedScenario.id)}-6)`,
                  }}
                />
                <Badge
                  color={getScenarioColor(selectedScenario.id)}
                  variant="light"
                >
                  {selectedScenario.label}
                </Badge>
              </Group>
            </Group>

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
        {selectedResult && selectedScenario && (
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Cash Flow Timeline
            </Text>
            <Text size="xs" c="dimmed">
              Inflows, outflows, and net cash flow for{" "}
              <Text span fw={600}>
                {selectedScenario.label}
              </Text>{" "}
              over the project lifetime.
            </Text>

            {cashFlowData ? (
              <Stack gap="xs">
                <CashFlowChart
                  data={cashFlowData}
                  projectLifetime={
                    selectedResult.riskAssessment?.metadata.project_lifetime
                  }
                  scenarioLabel={selectedScenario.label}
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
                  Showing cash flow image from API for{" "}
                  <Text span fw={600}>
                    {selectedScenario.label}
                  </Text>{" "}
                  (no structured data returned).
                </Text>
                <img
                  src={cashFlowVisualization}
                  alt={`Cash flow timeline for ${selectedScenario.label}`}
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
                  Cash flow data is not available for {selectedScenario.label}{" "}
                  yet.
                </Text>
              </Card>
            )}
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
          result.returnOnInvestment) * 100,
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
  selectedScenarioId: ScenarioId | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

function ScenarioComparisonTable({
  scenarios,
  financialResults,
  selectedScenarioId,
  onSelectScenario,
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

  const headerButtonStyle = (color: string, isSelected: boolean) => ({
    display: "block",
    width: "100%",
    padding: "10px 8px",
    borderRadius: "var(--mantine-radius-md)",
    border: "1px solid transparent",
    backgroundColor: isSelected
      ? `var(--mantine-color-${color}-0)`
      : "transparent",
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "background-color 0.15s ease",
  });
  const cellButtonStyle = (color: string, isSelected: boolean) => ({
    display: "block",
    width: "100%",
    padding: "8px 6px",
    borderRadius: "var(--mantine-radius-sm)",
    border: "1px solid transparent",
    backgroundColor: isSelected
      ? `var(--mantine-color-${color}-0)`
      : "transparent",
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "background-color 0.15s ease",
  });

  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Metric</Table.Th>
            {scenarios.map((scenario) => {
              const color = getScenarioColor(scenario.id);
              const isSelected = scenario.id === selectedScenarioId;
              const isSelectable = hasFinancialResultForScenario(
                financialResults,
                scenario.id,
              );

              return (
                <Table.Th
                  key={scenario.id}
                  style={{
                    textAlign: "center",
                    backgroundColor: `var(--mantine-color-${color}-${isSelected ? 1 : 0})`,
                    boxShadow: isSelected
                      ? `inset 0 0 0 1px var(--mantine-color-${color}-4)`
                      : undefined,
                  }}
                >
                  {isSelectable ? (
                    <UnstyledButton
                      onClick={() => onSelectScenario(scenario.id)}
                      style={headerButtonStyle(color, isSelected)}
                      aria-pressed={isSelected}
                    >
                      <Stack gap={4} align="center">
                        <Group gap={6} justify="center" align="center">
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: `var(--mantine-color-${color}-6)`,
                            }}
                          />
                          <Text size="sm" fw={600}>
                            {scenario.label}
                          </Text>
                        </Group>
                        <Text
                          size="xs"
                          c={isSelected ? `${color}.7` : "dimmed"}
                          fw={isSelected ? 600 : 500}
                        >
                          {isSelected ? "Viewing details" : "Select package"}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  ) : (
                    <Stack gap={6} align="center">
                      <Group gap={6} justify="center" align="center">
                        <Box
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: `var(--mantine-color-${color}-4)`,
                          }}
                        />
                        <Text size="sm" fw={600} c="dimmed">
                          {scenario.label}
                        </Text>
                      </Group>
                      <Badge size="xs" color="gray" variant="light">
                        No data
                      </Badge>
                    </Stack>
                  )}
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {metrics.map((metric) => (
            <Table.Tr key={metric.label}>
              <Table.Td fw={500}>{metric.label}</Table.Td>
              {scenarios.map((scenario) => {
                const fr = financialResults[scenario.id];
                const color = getScenarioColor(scenario.id);
                const isSelected = scenario.id === selectedScenarioId;
                if (!fr) {
                  return (
                    <Table.Td
                      key={scenario.id}
                      style={{
                        textAlign: "center",
                        color: "var(--mantine-color-dimmed)",
                      }}
                    >
                      <Text size="sm" c="dimmed">
                        N/A
                      </Text>
                    </Table.Td>
                  );
                }
                return (
                  <Table.Td
                    key={scenario.id}
                    style={{ textAlign: "center", padding: 0 }}
                  >
                    <UnstyledButton
                      onClick={() => onSelectScenario(scenario.id)}
                      style={cellButtonStyle(color, isSelected)}
                    >
                      <Text size="sm" fw={500}>
                        {metric.formatter(metric.getValue(fr))}
                      </Text>
                    </UnstyledButton>
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
