/**
 * ScenarioComparison Component
 * Displays a comparison table of all renovation scenarios.
 */

import {
  Box,
  Card,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type { RenovationScenario } from "../../context/types";
import {
  calculatePercentChange,
  formatCurrency,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { DeltaBadge, EPCBadge } from "../shared";

export function ScenarioComparison() {
  const { state } = useHomeAssistant();
  const { scenarios, estimation } = state;

  if (scenarios.length === 0 || !estimation) {
    return null;
  }

  // Get the current scenario for baseline comparisons
  const currentScenario = scenarios.find((s) => s.id === "current");
  const renovationScenarios = scenarios.filter((s) => s.id !== "current");

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Box>
          <Title order={3} mb="xs">
            Scenario Comparison
          </Title>
          <Text size="sm" c="dimmed">
            Compare energy and comfort metrics across renovation scenarios
          </Text>
        </Box>

        <ScrollArea>
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Metric</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>
                  Current Status
                </Table.Th>
                {renovationScenarios.map((scenario) => (
                  <Table.Th key={scenario.id} style={{ textAlign: "center" }}>
                    {scenario.label}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {/* EPC Row */}
              <Table.Tr>
                <Table.Td fw={500}>EPC Rank</Table.Td>
                <Table.Td style={{ textAlign: "center" }}>
                  <EPCBadge
                    epcClass={
                      currentScenario?.epcClass || estimation.estimatedEPC
                    }
                    size="md"
                  />
                </Table.Td>
                {renovationScenarios.map((scenario) => (
                  <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
                    <EPCBadge epcClass={scenario.epcClass} size="md" />
                  </Table.Td>
                ))}
              </Table.Tr>

              {/* Energy Needs Row */}
              <MetricRow
                label="Annual Energy Needs"
                baseValue={
                  currentScenario?.annualEnergyNeeds ||
                  estimation.annualEnergyNeeds
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.annualEnergyNeeds}
                formatter={formatEnergyPerYear}
                lowerIsBetter
              />

              {/* Energy Cost Row */}
              <MetricRow
                label="Cost of Annual Energy Needs"
                baseValue={
                  currentScenario?.annualEnergyCost ||
                  estimation.annualEnergyCost
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.annualEnergyCost}
                formatter={formatCurrency}
                lowerIsBetter
              />

              {/* Heating/Cooling Row */}
              <MetricRow
                label="Annual Heating/Cooling Needs"
                baseValue={
                  currentScenario?.heatingCoolingNeeds ||
                  estimation.heatingCoolingNeeds
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.heatingCoolingNeeds}
                formatter={formatEnergyPerYear}
                lowerIsBetter
              />

              {/* Flexibility Index Row */}
              <MetricRow
                label="Flexibility Index"
                baseValue={
                  currentScenario?.flexibilityIndex ||
                  estimation.flexibilityIndex
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.flexibilityIndex}
                formatter={(v) => v.toString()}
                lowerIsBetter={false}
              />

              {/* Comfort Index Row */}
              <MetricRow
                label="Comfort Index"
                baseValue={
                  currentScenario?.comfortIndex || estimation.comfortIndex
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.comfortIndex}
                formatter={(v) => v.toString()}
                lowerIsBetter={false}
              />
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

interface MetricRowProps {
  label: string;
  baseValue: number;
  scenarios: RenovationScenario[];
  getValue: (scenario: RenovationScenario) => number;
  formatter: (value: number) => string;
  lowerIsBetter: boolean;
}

function MetricRow({
  label,
  baseValue,
  scenarios,
  getValue,
  formatter,
  lowerIsBetter,
}: MetricRowProps) {
  return (
    <Table.Tr>
      <Table.Td fw={500}>{label}</Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        <Text size="sm">{formatter(baseValue)}</Text>
      </Table.Td>
      {scenarios.map((scenario) => {
        const value = getValue(scenario);
        const delta = calculatePercentChange(baseValue, value);

        return (
          <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
            <Stack gap={4} align="center">
              <Text size="sm">{formatter(value)}</Text>
              <DeltaBadge delta={delta} higherIsBetter={!lowerIsBetter} />
            </Stack>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}
