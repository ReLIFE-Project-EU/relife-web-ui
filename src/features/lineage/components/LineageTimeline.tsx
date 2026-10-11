import { Badge, Group, Stack, Table, Text, Timeline } from "@mantine/core";
import { ConceptExplainer } from "../../../components/shared/ConceptExplainer";
import { formatFixed, formatNumber } from "../../../utils/formatters";
import type {
  LineageActor,
  LineageRow,
  LineageStep,
  LineageTable,
  LineageValue,
} from "../lineageModel";

const ACTOR_BADGES: Record<LineageActor, { label: string; color: string }> = {
  input: { label: "Input", color: "gray" },
  "web-ui": { label: "Web UI", color: "relife" },
  forecasting: { label: "Forecasting service", color: "blue" },
  financial: { label: "Financial service", color: "grape" },
};

function formatValue(value: LineageValue, row: LineageRow): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return row.decimals ? formatFixed(value, row.decimals) : formatNumber(value);
}

function StepTable({ table }: { table: LineageTable }) {
  return (
    <Table.ScrollContainer minWidth="max-content">
      <Table striped withTableBorder verticalSpacing="xs">
        {table.columns.length > 0 && (
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              {table.columns.map((column) => (
                <Table.Th key={column} ta="right">
                  {column}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
        )}
        <Table.Tbody>
          {table.rows.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Td>
                {row.label}
                {row.conceptId && (
                  <>
                    {" "}
                    <ConceptExplainer conceptId={row.conceptId} />
                  </>
                )}
              </Table.Td>
              {row.values.map((value, index) => (
                <Table.Td key={index} ta="right">
                  {formatValue(value, row)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function LineageTimeline({ steps }: { steps: LineageStep[] }) {
  return (
    <Timeline>
      {steps.map((step) => (
        <Timeline.Item
          key={step.title}
          title={
            <Group gap="xs">
              <Text fw={600}>{step.title}</Text>
              <Badge variant="light" color={ACTOR_BADGES[step.actor].color}>
                {ACTOR_BADGES[step.actor].label}
              </Badge>
            </Group>
          }
        >
          <Stack gap="xs" mt="xs">
            {step.caption && (
              <Text size="sm" c="dimmed">
                {step.caption}
              </Text>
            )}
            {step.tables.map((table, index) => (
              <StepTable key={index} table={table} />
            ))}
          </Stack>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
