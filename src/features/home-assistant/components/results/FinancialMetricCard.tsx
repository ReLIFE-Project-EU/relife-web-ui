/**
 * FinancialMetricCard Component
 * Displays a financial metric with optional percentile range visualization.
 * Gracefully degrades to show only point value when no range is available.
 */

import { Card, Group, Stack, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import type { ReactNode } from "react";
import type { MetricRange } from "../../../../services/appraisalReadout";
import type { ConceptId } from "../../../../constants/relifeConcepts";
import {
  financialMetricConceptIds,
  relifeConcepts,
} from "../../../../constants/relifeConcepts";
import {
  MetricExplainer,
  RangeIndicator,
  type FinancialMetricType,
} from "../shared";

export interface FinancialMetricCardProps {
  conceptId?: ConceptId;
  /** The metric type for explanations */
  metricType: FinancialMetricType;
  /** Point forecast (P50/median), already rendered */
  value: ReactNode;
  /** P10–P90 range, when the appraisal has a meaningful one */
  range?: MetricRange;
  /** Color scheme */
  color?: MantineColor;
  /** Whether lower values are better (e.g., payback period) */
  lowerIsBetter?: boolean;
  /** Whether this is a highlighted/primary metric */
  highlighted?: boolean;
}

export function FinancialMetricCard({
  conceptId,
  metricType,
  value,
  range,
  color = "blue",
  lowerIsBetter = false,
  highlighted = false,
}: FinancialMetricCardProps) {
  const concept =
    relifeConcepts[conceptId ?? financialMetricConceptIds[metricType]];

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
            {concept.label}
          </Text>
          <MetricExplainer metric={metricType} />
        </Group>

        {/* Main value */}
        <Text size="xl" fw={700} c={highlighted ? `${color}.7` : undefined}>
          {value}
        </Text>

        {range && (
          <RangeIndicator
            min={range.low}
            median={range.median}
            max={range.high}
            formatter={range.format}
            color={color}
            lowerIsBetter={lowerIsBetter}
            size="sm"
          />
        )}
      </Stack>
    </Card>
  );
}
