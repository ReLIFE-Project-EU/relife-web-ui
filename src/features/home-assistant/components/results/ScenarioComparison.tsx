/**
 * ScenarioComparison Component
 * Displays a comparison table of all renovation scenarios.
 */

import { Badge, Box, Card, Stack, Table, Text, Title } from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type { RenovationScenario } from "../../context/types";
import type { ConceptId } from "../../../../constants/relifeConcepts";
import { relifeConcepts } from "../../../../constants/relifeConcepts";
import {
  calculatePercentChange,
  formatCurrency,
  formatCurrencyDecimal,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../services/energyUtils";
import {
  getEpcScenarioTooltipNotes,
  getRenovationMeasureFlags,
  renovationScenariosNeedEpcComparisonNote,
} from "../../../../utils/renovationMeasureFlags";
import { ConceptLabel, DeltaBadge, EPCBadge } from "../shared";

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

  const showScenarioEpcComparisonNote =
    renovationScenariosNeedEpcComparisonNote(renovationScenarios);

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

        <Table.ScrollContainer minWidth={900}>
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
                  <MetricLabel conceptId="estimated-epc" />
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
                  const intensity = computeIntensity(
                    scenario.annualEnergyNeeds,
                  );
                  const measureFlags = getRenovationMeasureFlags(
                    scenario.measureIds,
                  );
                  const additionalTooltipNotes =
                    getEpcScenarioTooltipNotes(measureFlags);
                  return (
                    <Table.Td key={scenario.id} style={{ textAlign: "center" }}>
                      <Stack gap={4} align="center">
                        <EPCBadge
                          epcClass={scenario.epcClass}
                          size="md"
                          energyIntensity={intensity}
                          estimated
                          additionalTooltipNotes={
                            additionalTooltipNotes.length > 0
                              ? additionalTooltipNotes
                              : undefined
                          }
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
                  <MetricLabel conceptId="annual-building-thermal-needs" />
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
                label={<MetricLabel conceptId="estimated-thermal-needs-cost" />}
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
                label={<MetricLabel conceptId="system-energy-consumption" />}
                baseValue={currentScenario?.deliveredTotal}
                scenarios={renovationScenarios}
                getValue={(s) => s.deliveredTotal}
                formatter={formatEnergyPerYear}
                lowerIsBetter
              />
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Stack gap="xs">
          {showScenarioEpcComparisonNote ? (
            <Text size="xs" c="dimmed">
              {relifeConcepts["scenario-epc-comparison-note"].description}
            </Text>
          ) : null}
          <Text size="xs" c="dimmed">
            Thermal-needs cost values are frontend estimates based on a flat
            tariff of {formatCurrencyDecimal(ENERGY_PRICE_EUR_PER_KWH)}/kWh.
            System energy consumption is shown in kWh/year only because its real
            cost depends on fuel and electricity prices.
          </Text>
        </Stack>
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

function MetricLabel({ conceptId }: { conceptId: ConceptId }) {
  return <ConceptLabel conceptId={conceptId} />;
}
