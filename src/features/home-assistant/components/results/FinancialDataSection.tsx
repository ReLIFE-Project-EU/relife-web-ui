/**
 * FinancialDataSection Component
 * Displays financial metrics with scenario selection.
 */

import {
  Badge,
  Box,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
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
              {/* Capital Expenditure */}
              <FinancialMetricRow
                label="Capital Expenditure"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.capitalExpenditure}
                formatter={formatCurrency}
              />

              {/* ROI */}
              <FinancialMetricRow
                label="Return on Investment"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.returnOnInvestment}
                formatter={(v) => formatPercent(v)}
              />

              {/* Payback Time */}
              <FinancialMetricRow
                label="Payback Time"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.paybackTime}
                formatter={formatYears}
                getRange={(fr) => fr.paybackTimeRange}
              />

              {/* NPV */}
              <FinancialMetricRow
                label="Net Present Value"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.netPresentValue}
                formatter={formatCurrency}
                getRange={(fr) => fr.npvRange}
              />

              {/* ARV */}
              <FinancialMetricRow
                label="After Renovation Value"
                scenarios={renovationScenarios}
                financialResults={financialResults}
                getValue={(fr) => fr.afterRenovationValue}
                formatter={formatCurrency}
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
  scenarios: { id: ScenarioId; label: string }[];
  financialResults: Record<ScenarioId, FinancialResults>;
  getValue: (fr: FinancialResults) => number;
  formatter: (value: number) => string;
  getRange?: (fr: FinancialResults) => { min: number; max: number } | undefined;
}

function FinancialMetricRow({
  label,
  scenarios,
  financialResults,
  getValue,
  formatter,
  getRange,
}: FinancialMetricRowProps) {
  return (
    <Table.Tr>
      <Table.Td fw={500}>{label}</Table.Td>
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
