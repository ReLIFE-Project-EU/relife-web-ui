import {
  CompositeChart,
  type ChartReferenceLineProps,
  type CompositeChartSeries,
} from "@mantine/charts";
import { Box, Card, Group, Stack, Text } from "@mantine/core";
import type { CashFlowData } from "../../context/types";
import { formatCurrency } from "../../utils/formatters";

const compactCurrency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface CashFlowChartProps {
  data: CashFlowData;
  projectLifetime?: number;
  title?: string;
}

const series: CompositeChartSeries[] = [
  { name: "Inflows", color: "#27ae60", type: "bar" },
  { name: "Outflows", color: "#e74c3c", type: "bar" },
  { name: "Net cash flow", color: "#2c3e50", type: "line" },
];
type LegendItem = {
  name: string;
  color: string;
  dashed?: boolean;
};

const legendItems: LegendItem[] = [
  { name: "Inflows", color: "#27ae60" },
  { name: "Outflows", color: "#e74c3c" },
  { name: "Net cash flow", color: "#2c3e50" },
];

function toChartData(data: CashFlowData) {
  const inflows = data.annual_inflows ?? [];
  const outflows = data.annual_outflows ?? [];
  const net = data.annual_net_cash_flow
    ? data.annual_net_cash_flow
    : inflows.map((value, idx) => value - (outflows[idx] ?? 0));

  return data.years.map((year, idx) => ({
    year,
    Inflows: inflows[idx] ?? 0,
    Outflows: -(outflows[idx] ?? 0), // negative to render downward bars
    "Net cash flow": net[idx] ?? 0,
  }));
}

export function CashFlowChart({
  data,
  projectLifetime,
  title = "Cash flow timeline",
}: CashFlowChartProps) {
  const chartData = toChartData(data);
  const tickInterval =
    chartData.length > 12 ? Math.ceil(chartData.length / 12) : 0;

  const referenceLines: ChartReferenceLineProps[] = [
    { y: 0, color: "gray.5", label: "0€", labelPosition: "insideTop" },
  ];

  if (data.breakeven_year !== undefined && data.breakeven_year !== null) {
    referenceLines.push({
      x: data.breakeven_year,
      color: "teal.6",
      label: `Breakeven (Year ${data.breakeven_year})`,
      labelPosition: "insideTop",
      strokeDasharray: "5 5",
    });
  }

  if (data.loan_term && data.loan_term > 0) {
    referenceLines.push({
      x: data.loan_term,
      color: "orange.6",
      label: `Loan paid off (Year ${data.loan_term})`,
      labelPosition: "insideTop",
      strokeDasharray: "5 5",
    });
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600}>{title}</Text>
            <Text size="sm" c="dimmed">
              Annual inflows, outflows, and cumulative position across the
              project horizon.
            </Text>
          </div>
          {projectLifetime ? (
            <Text size="sm" c="dimmed">
              Horizon: {projectLifetime} years
            </Text>
          ) : null}
        </Group>

        <Box>
          <CompositeChart
            data={chartData}
            dataKey="year"
            series={series}
            withLegend={false}
            withTooltip
            h={360}
            referenceLines={referenceLines}
            xAxisProps={{
              interval: tickInterval,
              allowDecimals: false,
              label: { value: "Year", position: "insideBottom", dy: 10 },
            }}
            yAxisProps={{
              tickFormatter: (value: number) => compactCurrency.format(value),
              width: 72,
              label: {
                value: "Cash flow (€)",
                angle: -90,
                position: "insideLeft",
                dx: -10,
              },
            }}
            valueFormatter={(value) => formatCurrency(value)}
            gridAxis="xy"
            strokeDasharray="4 4"
            tooltipProps={{
              cursor: { strokeDasharray: "4 4" },
              labelFormatter: (label: string | number) => `Year ${label}`,
            }}
            composedChartProps={{
              margin: { top: 16, right: 16, bottom: 16, left: 16 },
            }}
          />
          <Group gap={12} mt="xs" wrap="wrap">
            {legendItems.map((item) => (
              <Group key={item.name} gap={6} align="center">
                <Box
                  style={{
                    width: 16,
                    height: 8,
                    background: item.color,
                    borderRadius: 4,
                    border: item.dashed ? "1px dashed #6c757d" : undefined,
                  }}
                />
                <Text size="xs" c="dimmed">
                  {item.name}
                </Text>
              </Group>
            ))}
            {referenceLines.some((r) => r.x !== undefined) && (
              <Group gap={6} align="center">
                <Box
                  style={{
                    width: 16,
                    height: 0,
                    borderTop: "2px dashed #228be6",
                  }}
                />
                <Text size="xs" c="dimmed">
                  Reference markers
                </Text>
              </Group>
            )}
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}
