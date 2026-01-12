/**
 * FinancialDataSection Component
 * Displays financial metrics with scenario selection.
 *
 * Updated to display new RiskAssessmentPointForecasts structure
 * with IRR, DPP, MonthlyAvgSavings, and SuccessRate indicators.
 */

import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type {
  FinancialResults,
  FinancialScenario,
  ScenarioId,
} from "../../context/types";
import {
  formatCurrency,
  formatPercent,
  formatYears,
} from "../../utils/formatters";

export function FinancialDataSection() {
  const { state, dispatch } = useHomeAssistant();
  const { scenarios, financialResults, selectedFinancialScenario, funding } =
    state;

  const renovationScenarios = scenarios.filter((s) => s.id !== "current");

  // Funding option labels for display
  const enabledFunding: string[] = [];
  if (funding.returnsOnBills.enabled) enabledFunding.push("Returns on Bills");
  if (funding.loan.enabled) enabledFunding.push("Loan");
  if (funding.subsidy.enabled) enabledFunding.push("Subsidy");

  const handleScenarioChange = (value: string) => {
    dispatch({
      type: "SELECT_FINANCIAL_SCENARIO",
      scenario: value as FinancialScenario,
    });
  };

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

        {/* Selectors */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
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

          {/* Scenario Selector */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Financial Scenario
            </Text>
            <SegmentedControl
              value={selectedFinancialScenario}
              onChange={handleScenarioChange}
              data={[
                { label: "Baseline", value: "baseline" },
                { label: "Optimistic", value: "optimistic" },
                { label: "Pessimistic", value: "pessimistic" },
              ]}
              fullWidth
            />
          </Box>
        </SimpleGrid>

        {/* Financial Metrics Table */}
        <ScrollArea>
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Financial Metric</Table.Th>
                {renovationScenarios.map((scenario) => (
                  <Table.Th key={scenario.id} style={{ textAlign: "center" }}>
                    {scenario.label}
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
