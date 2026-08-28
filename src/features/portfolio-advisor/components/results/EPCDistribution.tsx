/**
 * EPC class distribution across the portfolio, before and after renovation.
 *
 * Shown instead of an average class improvement: averaging class letters treats
 * them as an interval scale they are not, and hides how the stock is spread.
 */

import { Table, Text } from "@mantine/core";
import { EPCBadge } from "../../../../components/shared";
import { EPC_ORDER } from "../../../../utils/epcUtils";

interface EPCDistributionProps {
  /** Building counts per EPC class before renovation. */
  before: Record<string, number>;
  /** Building counts per EPC class after renovation. */
  after: Record<string, number>;
}

function Count({ value }: { value: number }) {
  return (
    <Text size="sm" c={value === 0 ? "dimmed" : undefined}>
      {value}
    </Text>
  );
}

export function EPCDistribution({ before, after }: EPCDistributionProps) {
  // Best class first, and only classes some building actually occupies.
  const classes = [...EPC_ORDER]
    .reverse()
    .filter((epcClass) => (before[epcClass] ?? 0) + (after[epcClass] ?? 0) > 0);

  if (classes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No EPC data available.
      </Text>
    );
  }

  return (
    <Table verticalSpacing="xs" horizontalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Class</Table.Th>
          <Table.Th>Before</Table.Th>
          <Table.Th>After</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {classes.map((epcClass) => (
          <Table.Tr key={epcClass}>
            <Table.Td>
              <EPCBadge epcClass={epcClass} size="sm" estimated />
            </Table.Td>
            <Table.Td>
              <Count value={before[epcClass] ?? 0} />
            </Table.Td>
            <Table.Td>
              <Count value={after[epcClass] ?? 0} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
