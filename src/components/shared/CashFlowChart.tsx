import {
  CompositeChart,
  type ChartReferenceLineProps,
  type CompositeChartSeries,
} from "@mantine/charts";
import { Box, Card, Group, Stack, Text } from "@mantine/core";
import { relifeConcepts } from "../../constants/relifeConcepts";
import { readingText, type Reading } from "../../services/appraisalReadout";
import type { CashFlowData } from "../../types/renovation";
import { formatCurrency } from "../../utils/formatters";

const CHART_HEIGHT = 360;
const MAX_X_TICKS = 12;
const Y_AXIS_WIDTH = 72;
const LEGEND_SWATCH_WIDTH = 16;
const LEGEND_SWATCH_HEIGHT = 8;
const CHART_MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };

/** Chart series, legend swatches and marker lines all read from here. */
const CASH_FLOW_COLORS = {
  inflows: "teal.6",
  outflows: "red.6",
  cumulative: "relife.8",
  marker: "gray.7",
  zero: "gray.5",
} as const;

function cssColor(color: string): string {
  return `var(--mantine-color-${color.replace(".", "-")})`;
}

interface CashFlowChartProps {
  data: CashFlowData;
  /** The appraisal's payback, drawn as a marker at the nearest year. */
  payback?: Reading;
  projectLifetime?: number;
  title?: string;
  scenarioLabel?: string;
}

const series: CompositeChartSeries[] = [
  { name: "Inflows", color: CASH_FLOW_COLORS.inflows, type: "bar" },
  { name: "Outflows", color: CASH_FLOW_COLORS.outflows, type: "bar" },
  {
    name: "Cumulative cash flow",
    color: CASH_FLOW_COLORS.cumulative,
    type: "line",
  },
];
type LegendItem = {
  name: string;
  color: string;
  dashed?: boolean;
};

const legendItems: LegendItem[] = [
  { name: "Inflows", color: cssColor(CASH_FLOW_COLORS.inflows) },
  { name: "Outflows", color: cssColor(CASH_FLOW_COLORS.outflows) },
  {
    name: "Cumulative cash flow",
    color: cssColor(CASH_FLOW_COLORS.cumulative),
  },
];

function toChartData(data: CashFlowData) {
  const inflows = data.annual_inflows ?? [];
  const outflows = data.annual_outflows ?? [];
  const net = data.annual_net_cash_flow
    ? data.annual_net_cash_flow
    : inflows.map((value, idx) => value - (outflows[idx] ?? 0));
  const cumulative =
    data.cumulative_cash_flow ??
    net.reduce<number[]>((acc, value, idx) => {
      const previous = idx === 0 ? 0 : acc[idx - 1];
      acc.push(previous + value);
      return acc;
    }, []);

  return data.years.map((year, idx) => ({
    year,
    Inflows: inflows[idx] ?? 0,
    Outflows: -(outflows[idx] ?? 0), // negative to render downward bars
    "Cumulative cash flow": cumulative[idx] ?? 0,
  }));
}

export function CashFlowChart({
  data,
  payback,
  projectLifetime,
  title = "Cash flow timeline",
  scenarioLabel,
}: CashFlowChartProps) {
  const chartData = toChartData(data);
  const tickInterval =
    chartData.length > MAX_X_TICKS
      ? Math.ceil(chartData.length / MAX_X_TICKS)
      : 0;

  const referenceLines: ChartReferenceLineProps[] = [
    {
      y: 0,
      color: CASH_FLOW_COLORS.zero,
      label: formatCurrency(0),
      labelPosition: "insideTop",
    },
  ];

  if (payback?.kind === "value") {
    referenceLines.push({
      x: Math.round(payback.value),
      color: CASH_FLOW_COLORS.marker,
      label: `${relifeConcepts["payback-period"].label}: ${readingText(payback)}`,
      labelPosition: "insideBottom",
      strokeDasharray: "5 5",
    });
  }

  const loanOutlastsHorizon =
    projectLifetime !== undefined && (data.loan_term ?? 0) > projectLifetime;

  if (data.loan_term && data.loan_term > 0 && !loanOutlastsHorizon) {
    referenceLines.push({
      x: data.loan_term,
      color: CASH_FLOW_COLORS.marker,
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
            {scenarioLabel ? (
              <Text size="xs" c="dimmed" mt={4}>
                Showing package: {scenarioLabel}
              </Text>
            ) : null}
          </div>
          {projectLifetime ? (
            <Text size="sm" c="dimmed">
              Project lifetime: {projectLifetime} years
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
            h={CHART_HEIGHT}
            referenceLines={referenceLines}
            xAxisProps={{
              interval: tickInterval,
              allowDecimals: false,
            }}
            yAxisProps={{
              tickFormatter: (value: number) => formatCurrency(value),
              width: Y_AXIS_WIDTH,
            }}
            valueFormatter={(value) => formatCurrency(value)}
            gridAxis="xy"
            strokeDasharray="4 4"
            tooltipProps={{
              cursor: { strokeDasharray: "4 4" },
              labelFormatter: (label: string | number) => `Year ${label}`,
            }}
            composedChartProps={{
              margin: CHART_MARGIN,
            }}
          />
          <Group gap={12} mt="xs" wrap="wrap">
            {legendItems.map((item) => (
              <Group key={item.name} gap={6} align="center">
                <Box
                  style={{
                    width: LEGEND_SWATCH_WIDTH,
                    height: LEGEND_SWATCH_HEIGHT,
                    background: item.color,
                    borderRadius: 4,
                    border: item.dashed
                      ? "1px dashed var(--mantine-color-gray-6)"
                      : undefined,
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
                    width: LEGEND_SWATCH_WIDTH,
                    height: 0,
                    borderTop: `2px dashed ${cssColor(CASH_FLOW_COLORS.marker)}`,
                  }}
                />
                <Text size="xs" c="dimmed">
                  Reference markers
                </Text>
              </Group>
            )}
          </Group>
          {loanOutlastsHorizon ? (
            <Text size="xs" c="dimmed" mt="xs">
              The loan runs past the {projectLifetime}-year project lifetime, so
              the remaining balance is repaid in year {projectLifetime}.
            </Text>
          ) : null}
        </Box>
      </Stack>
    </Card>
  );
}
