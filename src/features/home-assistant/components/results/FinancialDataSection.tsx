/**
 * FinancialDataSection Component
 * Displays financial metrics for renovation scenarios.
 *
 * Updated to display new RiskAssessmentPointForecasts structure
 * with IRR, DPP, MonthlyAvgSavings, and SuccessRate indicators.
 */

import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Card,
  Group,
  Progress,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { CashFlowChart } from "./CashFlowChart";
import type {
  CashFlowData,
  FinancialResults,
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

  const renovationScenarios = scenarios.filter((s) => s.id !== "current");
  const [chartScenarioId, setChartScenarioId] = useState<ScenarioId | null>(
    renovationScenarios[0]?.id ?? null,
  );

  const effectiveChartScenarioId =
    (chartScenarioId &&
      renovationScenarios.some((s) => s.id === chartScenarioId) &&
      chartScenarioId) ||
    renovationScenarios[0]?.id ||
    null;

  // Funding option labels for display
  const enabledFunding: string[] = [];
  if (funding.financingType === "loan") {
    enabledFunding.push("Loan");
  } else {
    enabledFunding.push("Self-funded");
  }

  const selectedCashFlowResult =
    effectiveChartScenarioId && financialResults[effectiveChartScenarioId]
      ? financialResults[effectiveChartScenarioId]
      : undefined;

  const cashFlowData: CashFlowData | undefined =
    selectedCashFlowResult?.riskAssessment?.cashFlowData ??
    (selectedCashFlowResult?.riskAssessment?.metadata.cash_flow_data as
      | CashFlowData
      | undefined);

  const cashFlowVisualization =
    selectedCashFlowResult?.riskAssessment?.cashFlowVisualization;

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
            Financial Data
          </Title>
        </Box>

        {/* Funding Options Display */}
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

        {/* Cash Flow Chart */}
        {selectedCashFlowResult ? (
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" fw={500}>
                  Cash flow timeline
                </Text>
                <Text size="xs" c="dimmed">
                  Inflows, outflows, and net cash flow for the selected
                  renovation package.
                </Text>
              </div>
              {renovationScenarios.length > 1 ? (
                <SegmentedControl
                  value={effectiveChartScenarioId ?? undefined}
                  onChange={(value) => setChartScenarioId(value as ScenarioId)}
                  data={renovationScenarios.map((scenario) => ({
                    label: scenario.label,
                    value: scenario.id,
                  }))}
                />
              ) : null}
            </Group>

            {cashFlowData ? (
              <Stack gap="xs">
                <CashFlowChart
                  data={cashFlowData}
                  projectLifetime={
                    selectedCashFlowResult.riskAssessment?.metadata
                      .project_lifetime
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
                {cashFlowData.breakeven_year === null ? (
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
                ) : null}
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
        ) : null}

        {/* Financial Metrics Table */}
        <ScrollArea>
          <Table
            highlightOnHover
            striped
            withTableBorder
            withColumnBorders
            verticalSpacing="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Financial Metric</Table.Th>
                {renovationScenarios.map((scenario) => (
                  <Table.Th
                    key={scenario.id}
                    style={{
                      textAlign: "center",
                      backgroundColor: `var(--mantine-color-${getScenarioColor(
                        scenario.id,
                      )}-0)`,
                    }}
                  >
                    <Group gap={6} justify="center" align="center">
                      <Box
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: `var(--mantine-color-${getScenarioColor(
                            scenario.id,
                          )}-6)`,
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
              {/* Capital Expenditure (CAPEX) */}
              <FinancialMetricRow
                label="Capital Expenditure"
                tooltip="Total upfront investment required"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.capitalExpenditure}
                formatter={formatCurrency}
              />

              {/* Net Present Value (NPV) */}
              <FinancialMetricRow
                label="Net Present Value"
                tooltip="Present value of all future cash flows minus initial investment"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) =>
                  fr.riskAssessment?.pointForecasts.NPV ?? fr.netPresentValue
                }
                formatter={formatCurrency}
                getRange={(fr) => fr.npvRange}
              />

              {/* Internal Rate of Return (IRR) - NEW */}
              <FinancialMetricRow
                label="Internal Rate of Return"
                tooltip="The discount rate that makes NPV equal to zero"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) =>
                  (fr.riskAssessment?.pointForecasts.IRR ?? 0) * 100
                }
                formatter={(v) => formatPercent(v)}
              />

              {/* Return on Investment (ROI) */}
              <FinancialMetricRow
                label="Return on Investment"
                tooltip="Total return relative to investment cost"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) =>
                  (fr.riskAssessment?.pointForecasts.ROI ??
                    fr.returnOnInvestment / 100) * 100
                }
                formatter={(v) => formatPercent(v)}
              />

              {/* Payback Period (PBP) */}
              <FinancialMetricRow
                label="Simple Payback Period"
                tooltip="Years until investment is recovered from savings"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) =>
                  fr.riskAssessment?.pointForecasts.PBP ?? fr.paybackTime
                }
                formatter={formatYears}
                getRange={(fr) => fr.paybackTimeRange}
              />

              {/* Discounted Payback Period (DPP) - NEW */}
              <FinancialMetricRow
                label="Discounted Payback Period"
                tooltip="Years until investment is recovered, accounting for time value of money"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.riskAssessment?.pointForecasts.DPP ?? 0}
                formatter={formatYears}
              />

              {/* Monthly Average Savings - NEW */}
              <FinancialMetricRow
                label="Monthly Average Savings"
                tooltip="Expected monthly savings after accounting for loan payments"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) =>
                  fr.riskAssessment?.pointForecasts.MonthlyAvgSavings ?? 0
                }
                formatter={formatCurrency}
              />

              <BreakEvenRow
                scenarios={renovationScenarios}
                financialResults={financialResults}
              />

              {/* After Renovation Value (ARV) */}
              <FinancialMetricRow
                label="After Renovation Value"
                tooltip="Estimated property value after renovation"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.arv?.totalPrice ?? fr.afterRenovationValue}
                formatter={formatCurrency}
              />

              {/* Success Rate - NEW (displayed as progress bar) */}
              <SuccessRateRow
                scenarios={renovationScenarios}
                financialResults={financialResults}
              />
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

interface FinancialMetricRowProps {
  label: string;
  tooltip?: string;
  scenarios: { id: ScenarioId; label: string }[];
  financialResults: Record<ScenarioId, FinancialResults>;
  getValue: (fr: FinancialResults) => number;
  formatter: (value: number) => string;
  getRange?: (fr: FinancialResults) => { min: number; max: number } | undefined;
}

function FinancialMetricRow({
  label,
  tooltip,
  scenarios,
  financialResults,
  getValue,
  formatter,
  getRange,
}: FinancialMetricRowProps) {
  return (
    <Table.Tr>
      <Table.Td fw={500}>
        <Group gap={4}>
          {label}
          {tooltip && (
            <Tooltip label={tooltip} withArrow multiline w={220}>
              <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
            </Tooltip>
          )}
        </Group>
      </Table.Td>
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

        const value = getValue(fr);
        const range = getRange?.(fr);

        return (
          <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
            <Stack gap={2} align="center">
              <Text size="sm" fw={500}>
                {formatter(value)}
              </Text>
              {range && (
                <Text size="xs" c="dimmed">
                  ({formatter(range.min)} - {formatter(range.max)})
                </Text>
              )}
            </Stack>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

interface SuccessRateRowProps {
  scenarios: { id: ScenarioId; label: string }[];
  financialResults: Record<ScenarioId, FinancialResults>;
}

interface BreakEvenRowProps {
  scenarios: { id: ScenarioId; label: string }[];
  financialResults: Record<ScenarioId, FinancialResults>;
}

function BreakEvenRow({ scenarios, financialResults }: BreakEvenRowProps) {
  return (
    <Table.Tr>
      <Table.Td fw={500}>
        <Group gap={4}>
          Break-even Year
          <Tooltip
            label="First year when cumulative cash flow turns positive"
            withArrow
            multiline
            w={220}
          >
            <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
          </Tooltip>
        </Group>
      </Table.Td>
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

        const cashFlowData =
          fr.riskAssessment?.cashFlowData ??
          (fr.riskAssessment?.metadata.cash_flow_data as
            | CashFlowData
            | undefined);
        const breakevenYear = cashFlowData?.breakeven_year;

        if (breakevenYear === undefined) {
          return (
            <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
              <Badge variant="light" color="gray">
                Not available
              </Badge>
            </Table.Td>
          );
        }

        if (breakevenYear === null) {
          return (
            <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
              <Badge variant="light" color="red">
                No break-even
              </Badge>
            </Table.Td>
          );
        }

        return (
          <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
            <Badge variant="light" color="green">
              Year {breakevenYear}
            </Badge>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

function SuccessRateRow({ scenarios, financialResults }: SuccessRateRowProps) {
  return (
    <Table.Tr>
      <Table.Td fw={500}>
        <Group gap={4}>
          Success Probability
          <Tooltip
            label="Probability of achieving positive financial returns based on Monte Carlo simulation"
            withArrow
            multiline
            w={220}
          >
            <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
          </Tooltip>
        </Group>
      </Table.Td>
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

        const successRate =
          fr.riskAssessment?.pointForecasts.SuccessRate ?? 0.5;
        const percentage = Math.round(successRate * 100);
        const color =
          percentage >= 80 ? "green" : percentage >= 60 ? "yellow" : "red";

        return (
          <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
            <Stack gap={4} align="center">
              <Progress value={percentage} color={color} size="lg" w={80} />
              <Text size="xs" c="dimmed">
                {percentage}%
              </Text>
            </Stack>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}
