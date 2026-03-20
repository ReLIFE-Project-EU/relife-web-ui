/**
 * ScenarioComparison Component
 * Displays a comparison table of all renovation scenarios.
 */

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  HoverCard,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type { RenovationScenario } from "../../context/types";
import {
  calculatePercentChange,
  formatCurrency,
  formatCurrencyDecimal,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../services/energyUtils";
import { DeltaBadge, EPCBadge } from "../shared";

export function ScenarioComparison() {
  const { state } = useHomeAssistant();
  const { scenarios, estimation } = state;
  const floorArea = state.building.floorArea;

  if (scenarios.length === 0 || !estimation) {
    return null;
  }

  // Get the current scenario for baseline comparisons
  const currentScenario = scenarios.find((s) => s.id === "current");
  const renovationScenarios = scenarios.filter((s) => s.id !== "current");

  const computeIntensity = (annualEnergyNeeds: number) =>
    floorArea && floorArea > 0 ? annualEnergyNeeds / floorArea : undefined;
  const scenarioIncludesSystemMeasure = (scenario: RenovationScenario) =>
    scenario.measureIds.some(
      (measureId) =>
        measureId === "condensing-boiler" ||
        measureId === "air-water-heat-pump",
    );

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
                <Table.Td fw={500}>
                  <MetricLabel
                    label="Estimated EPC"
                    description="Shown for the current home and envelope-only scenarios. Scenarios with system upgrades can lower energy use, but EPC is not recalculated here to avoid mixing different meanings."
                  />
                </Table.Td>
                <Table.Td style={{ textAlign: "center" }}>
                  {(() => {
                    const epc =
                      currentScenario?.epcClass || estimation.estimatedEPC;
                    const energy =
                      currentScenario?.annualEnergyNeeds ||
                      estimation.annualEnergyNeeds;
                    const intensity = computeIntensity(energy);
                    return (
                      <Stack gap={4} align="center">
                        <EPCBadge
                          epcClass={epc}
                          size="md"
                          energyIntensity={intensity}
                          estimated
                        />
                        {intensity !== undefined && (
                          <Text size="xs" c="dimmed">
                            ~{Math.round(intensity)} kWh/m²/y
                          </Text>
                        )}
                      </Stack>
                    );
                  })()}
                </Table.Td>
                {renovationScenarios.map((scenario) => {
                  if (scenarioIncludesSystemMeasure(scenario)) {
                    return (
                      <Table.Td
                        key={scenario.id}
                        style={{ textAlign: "center" }}
                      >
                        <Stack gap={4} align="center">
                          <Badge color="gray" variant="light">
                            Not shown
                          </Badge>
                          <Text size="xs" c="dimmed">
                            Includes a system upgrade
                          </Text>
                        </Stack>
                      </Table.Td>
                    );
                  }

                  const intensity = computeIntensity(
                    scenario.annualEnergyNeeds,
                  );
                  return (
                    <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
                      <Stack gap={4} align="center">
                        <EPCBadge
                          epcClass={scenario.epcClass}
                          size="md"
                          energyIntensity={intensity}
                          estimated
                        />
                        {intensity !== undefined && (
                          <Text size="xs" c="dimmed">
                            ~{Math.round(intensity)} kWh/m²/y
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                  );
                })}
              </Table.Tr>

              {/* Energy Needs Row */}
              <MetricRow
                label={
                  <MetricLabel
                    label="Annual building thermal needs"
                    description="The yearly heating and cooling your home needs to stay comfortable. This comes from the building simulation, not from the HVAC system's electricity or fuel use."
                  />
                }
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
                label={
                  <MetricLabel
                    label="Estimated cost of thermal needs"
                    description="A simple frontend estimate based on thermal needs and a flat tariff. This is not the same as your utility bill or the Financial API results."
                  />
                }
                baseValue={
                  currentScenario?.annualEnergyCost ||
                  estimation.annualEnergyCost
                }
                scenarios={renovationScenarios}
                getValue={(s) => s.annualEnergyCost}
                formatter={formatCurrency}
                lowerIsBetter
              />

              <OptionalMetricRow
                label={
                  <MetricLabel
                    label="Estimated system energy consumption"
                    description="The yearly electricity or fuel the HVAC system needs to meet the building's thermal needs. It comes from the backend UNI/TS 11300 simulation when available."
                  />
                }
                baseValue={currentScenario?.deliveredTotal}
                scenarios={renovationScenarios}
                getValue={(s) => s.deliveredTotal}
                formatter={formatEnergyPerYear}
                lowerIsBetter
              />

              {/* Flexibility Index Row */}
              <MetricRow
                label="Flexibility Index (0–100)"
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
                label="Comfort Index (0–100)"
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
        <Text size="xs" c="dimmed">
          Thermal-needs cost values are frontend estimates based on a flat
          tariff of {formatCurrencyDecimal(ENERGY_PRICE_EUR_PER_KWH)}/kWh.
          System energy consumption is shown in kWh/year only because its real
          cost depends on fuel and electricity prices.
        </Text>
      </Stack>
    </Card>
  );
}

interface OptionalMetricRowProps {
  label: React.ReactNode;
  baseValue: number | undefined;
  scenarios: RenovationScenario[];
  getValue: (scenario: RenovationScenario) => number | undefined;
  formatter: (value: number) => string;
  lowerIsBetter: boolean;
}

function OptionalMetricRow({
  label,
  baseValue,
  scenarios,
  getValue,
  formatter,
  lowerIsBetter,
}: OptionalMetricRowProps) {
  const anyValuePresent =
    baseValue !== undefined ||
    scenarios.some((scenario) => getValue(scenario) !== undefined);

  if (!anyValuePresent) {
    return null;
  }

  return (
    <Table.Tr>
      <Table.Td fw={500}>{label}</Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        {baseValue !== undefined ? (
          <Text size="sm">{formatter(baseValue)}</Text>
        ) : (
          <MissingValueBadge />
        )}
      </Table.Td>
      {scenarios.map((scenario) => {
        const value = getValue(scenario);
        const delta =
          value !== undefined && baseValue !== undefined
            ? calculatePercentChange(baseValue, value)
            : undefined;

        return (
          <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
            <Stack gap={4} align="center">
              {value !== undefined ? (
                <Text size="sm">{formatter(value)}</Text>
              ) : (
                <MissingValueBadge />
              )}
              {delta !== undefined ? (
                <DeltaBadge delta={delta} higherIsBetter={!lowerIsBetter} />
              ) : null}
            </Stack>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

function MissingValueBadge() {
  return (
    <Badge variant="light" color="gray">
      Not available
    </Badge>
  );
}

interface MetricRowProps {
  label: React.ReactNode;
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

function MetricLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <HoverCard width={260} shadow="md" position="top-start" withArrow>
      <HoverCard.Target>
        <ActionIcon.Group>
          <Text span inherit>
            {label}
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            aria-label={`Explain ${label.toLowerCase()}`}
          >
            <IconInfoCircle size={14} />
          </ActionIcon>
        </ActionIcon.Group>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text size="xs">{description}</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
