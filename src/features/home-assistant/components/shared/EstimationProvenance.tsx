import { Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconBuildingCommunity, IconHome } from "@tabler/icons-react";
import type { EstimationResult } from "../../../../types/renovation";
import { ConceptLabel, DeltaValue } from "../../../../components/shared";
import {
  calculatePercentChange,
  formatEnergyPerYear,
} from "../../utils/formatters";

export function ReferenceAdjustedComparisonCard({
  estimation,
}: {
  estimation: EstimationResult;
}) {
  const reference = estimation.referenceBaseline;

  if (!reference) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={3}>Reference vs adjusted home</Title>

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
                <ConceptLabel conceptId="annual-building-thermal-needs" />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {formatEnergyPerYear(reference.thermalNeed)}
                </Text>
              </Table.Td>
              <Table.Td>
                <DeltaValue
                  value={estimation.baseline.thermalNeed}
                  delta={calculatePercentChange(
                    reference.thermalNeed,
                    estimation.baseline.thermalNeed,
                  )}
                  formatter={formatEnergyPerYear}
                  higherIsBetter={false}
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}
