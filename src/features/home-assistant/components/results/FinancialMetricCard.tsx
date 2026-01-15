/**
 * FinancialMetricCard Component
 * Displays a financial metric with optional percentile range visualization.
 * Gracefully degrades to show only point value when percentiles unavailable.
 */

import { Card, Group, Stack, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { RangeIndicator } from "../shared/RangeIndicator";
import {
  MetricExplainer,
  type FinancialMetricType,
} from "../shared/MetricExplainer";
import type { PercentileData } from "../../context/types";

export interface FinancialMetricCardProps {
  /** Display label for the metric */
  label: string;
  /** The metric type for explanations */
  metricType: FinancialMetricType;
  /** Point forecast value (P50/median) */
  value: number;
  /** Formatter function for display */
  formatter: (value: number) => string;
  /** Optional percentile data for range display */
  percentiles?: PercentileData;
  /** Color scheme */
  color?: MantineColor;
  /** Whether lower values are better (e.g., payback period) */
  lowerIsBetter?: boolean;
  /** Whether this is a highlighted/primary metric */
  highlighted?: boolean;
}

export function FinancialMetricCard({
  label,
  metricType,
  value,
  formatter,
  percentiles,
  color = "blue",
  lowerIsBetter = false,
  highlighted = false,
}: FinancialMetricCardProps) {
  const hasPercentiles =
    percentiles &&
    percentiles.P10 !== undefined &&
    percentiles.P90 !== undefined;

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      bg={highlighted ? `${color}.0` : undefined}
    >
      <Stack gap="xs">
        {/* Header with label and info icon */}
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            {label}
          </Text>
          <MetricExplainer metric={metricType} />
        </Group>

        {/* Main value */}
        <Text size="xl" fw={700} c={highlighted ? `${color}.7` : undefined}>
          {formatter(value)}
        </Text>

        {/* Range indicator (only if percentiles available) */}
        {hasPercentiles && (
          <RangeIndicator
            min={percentiles.P10}
            median={percentiles.P50}
            max={percentiles.P90}
            formatter={formatter}
            color={color}
            lowerIsBetter={lowerIsBetter}
            size="sm"
          />
        )}
      </Stack>
    </Card>
  );
}
