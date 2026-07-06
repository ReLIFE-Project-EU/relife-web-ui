/**
 * RangeIndicator Component
 * Visualizes a value range (P10-P90) with a median marker.
 * Used to show uncertainty in financial metric forecasts.
 */

import { Box, Group, Text, Tooltip } from "@mantine/core";
import type { MantineColor } from "@mantine/core";

export interface RangeIndicatorProps {
  /** Lower bound of the 80% confidence interval (10th percentile, P10) */
  min: number;
  /** Median outcome (50th percentile, P50) */
  median: number;
  /** Upper bound of the 80% confidence interval (90th percentile, P90) */
  max: number;
  /** Formatter function for display values */
  formatter: (value: number) => string;
  /** Color scheme for the range bar */
  color?: MantineColor;
  /**
   * Whether lower values are better (e.g., payback period). Retained for
   * callers; the tooltip is labeled by percentile so it is not used here.
   */
  lowerIsBetter?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show min/max labels below the bar */
  showLabels?: boolean;
}

const sizeConfig = {
  sm: { barHeight: 6, fontSize: "xs" as const, markerSize: 10 },
  md: { barHeight: 8, fontSize: "xs" as const, markerSize: 12 },
  lg: { barHeight: 10, fontSize: "sm" as const, markerSize: 14 },
};

export function RangeIndicator({
  min,
  median,
  max,
  formatter,
  color = "blue",
  size = "md",
  showLabels = true,
}: RangeIndicatorProps) {
  const config = sizeConfig[size];

  // Calculate position of median marker as percentage
  const range = max - min;
  const medianPosition = range > 0 ? ((median - min) / range) * 100 : 50;

  return (
    <Box>
      {/* Range bar container */}
      <Tooltip
        label={
          <Box>
            <Text size="xs" fw={500}>
              80% confidence interval (P10–P90)
            </Text>
            <Text size="xs">Lower (P10): {formatter(min)}</Text>
            <Text size="xs">Median (P50): {formatter(median)}</Text>
            <Text size="xs">Upper (P90): {formatter(max)}</Text>
            <Text size="xs" c="dimmed">
              About 80% of modeled outcomes fall in this range; ~10% fall below
              and ~10% above.
            </Text>
          </Box>
        }
        withArrow
        multiline
        w={210}
      >
        <Box
          style={{
            position: "relative",
            height: config.barHeight + config.markerSize,
            cursor: "help",
          }}
        >
          {/* Background track */}
          <Box
            style={{
              position: "absolute",
              top: config.markerSize / 2 - config.barHeight / 2,
              left: 0,
              right: 0,
              height: config.barHeight,
              backgroundColor: `var(--mantine-color-${color}-1)`,
              borderRadius: config.barHeight / 2,
            }}
          />

          {/* Filled range (full bar represents the range) */}
          <Box
            style={{
              position: "absolute",
              top: config.markerSize / 2 - config.barHeight / 2,
              left: 0,
              right: 0,
              height: config.barHeight,
              background: `linear-gradient(to right, var(--mantine-color-${color}-2), var(--mantine-color-${color}-4))`,
              borderRadius: config.barHeight / 2,
            }}
          />

          {/* Median marker */}
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: `calc(${medianPosition}% - ${config.markerSize / 2}px)`,
              width: config.markerSize,
              height: config.markerSize,
              backgroundColor: `var(--mantine-color-${color}-6)`,
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </Box>
      </Tooltip>

      {/* Labels */}
      {showLabels && (
        <Group justify="space-between" mt={4}>
          <Text size={config.fontSize} c="dimmed">
            {formatter(min)}
          </Text>
          <Text size={config.fontSize} c="dimmed">
            {formatter(max)}
          </Text>
        </Group>
      )}
    </Box>
  );
}
