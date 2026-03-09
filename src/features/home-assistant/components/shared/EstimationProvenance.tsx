import { Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconBuildingCommunity, IconHome } from "@tabler/icons-react";
import type { EstimationResult } from "../../../../types/renovation";
import {
  calculatePercentChange,
  formatCurrency,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { DeltaValue } from "./DeltaValue";
import { EPCBadge } from "../../../../components/shared";

export function ReferenceAdjustedComparisonCard({
  estimation,
  floorArea,
}: {
  estimation: EstimationResult;
  floorArea?: number;
}) {
  const reference = estimation.referenceEstimation;

  if (!reference) {
    return null;
  }

  const referenceIntensity =
    floorArea && floorArea > 0
      ? reference.annualEnergyNeeds / floorArea
      : undefined;

  const adjustedIntensity =
    floorArea && floorArea > 0
      ? estimation.annualEnergyNeeds / floorArea
      : undefined;

  const epcChanged = estimation.estimatedEPC !== reference.estimatedEPC;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} mb="xs">
            Reference vs adjusted home
          </Title>
          <Text size="sm" c="dimmed">
            Comparison between the matched archetype and the adjusted home that
            was actually simulated.
          </Text>
        </div>

        <Table highlightOnHover withRowBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "40%" }} />
              <Table.Th>
                <Group gap="xs" wrap="nowrap">
                  <IconBuildingCommunity
                    size={14}
                    color="var(--mantine-color-gray-6)"
                  />
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    Reference archetype
                  </Text>
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap="xs" wrap="nowrap">
                  <IconHome size={14} color="var(--mantine-color-blue-6)" />
                  <Text size="xs" fw={600} tt="uppercase" c="blue">
                    Your adjusted home
                  </Text>
                </Group>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  Estimated EPC
                </Text>
              </Table.Td>
              <Table.Td>
                <EPCBadge
                  epcClass={reference.estimatedEPC}
                  size="md"
                  energyIntensity={referenceIntensity}
                  estimated
                />
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <EPCBadge
                    epcClass={estimation.estimatedEPC}
                    size="md"
                    energyIntensity={adjustedIntensity}
                    estimated
                  />
                  {epcChanged && (
                    <Text size="xs" c="dimmed">
                      from {reference.estimatedEPC}
                    </Text>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>

            <Table.Tr>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  Annual HVAC energy
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {formatEnergyPerYear(reference.annualEnergyNeeds)}
                </Text>
              </Table.Td>
              <Table.Td>
                <DeltaValue
                  value={estimation.annualEnergyNeeds}
                  delta={calculatePercentChange(
                    reference.annualEnergyNeeds,
                    estimation.annualEnergyNeeds,
                  )}
                  formatter={formatEnergyPerYear}
                  higherIsBetter={false}
                />
              </Table.Td>
            </Table.Tr>

            <Table.Tr>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  Annual HVAC cost
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {formatCurrency(reference.annualEnergyCost)}
                </Text>
              </Table.Td>
              <Table.Td>
                <DeltaValue
                  value={estimation.annualEnergyCost}
                  delta={calculatePercentChange(
                    reference.annualEnergyCost,
                    estimation.annualEnergyCost,
                  )}
                  formatter={formatCurrency}
                  higherIsBetter={false}
                />
              </Table.Td>
            </Table.Tr>

            <Table.Tr>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  Comfort index
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {reference.comfortIndex}
                </Text>
              </Table.Td>
              <Table.Td>
                <DeltaValue
                  value={estimation.comfortIndex}
                  delta={calculatePercentChange(
                    reference.comfortIndex,
                    estimation.comfortIndex,
                  )}
                  higherIsBetter
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Text size="sm" c="dimmed">
          We started from a standard building profile similar to yours, applied
          your specific details, ran an energy simulation, and calculated the
          results shown above.
        </Text>
      </Stack>
    </Card>
  );
}
