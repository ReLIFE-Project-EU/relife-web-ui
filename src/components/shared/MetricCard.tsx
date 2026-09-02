/**
 * MetricCard Component
 * Displays a metric with label and value in a styled card.
 *
 * The value sits at the bottom of a fixed-minimum-height box so that cards
 * with labels of differing length still line their numbers up across a grid.
 */

import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { MetricEyebrow } from "./MetricEyebrow";

/** Keeps values aligned across a row when labels wrap to different heights. */
export const METRIC_CARD_MIN_HEIGHT = 96;

interface MetricCardProps {
  /** Label describing the metric (string or React node for inline icons) */
  label: ReactNode;
  /** Formatted value to display (string or React node) */
  value: ReactNode;
  /** Optional variant for different visual styles */
  variant?: "default" | "highlight";
  /** Qualifier shown as an uppercase eyebrow above the label */
  prefix?: string;
}

export function MetricCard({
  label,
  value,
  variant = "default",
  prefix,
}: MetricCardProps) {
  const backgroundColor =
    variant === "highlight"
      ? "var(--mantine-color-blue-0)"
      : "var(--mantine-color-gray-0)";

  return (
    <Box
      p="md"
      mih={METRIC_CARD_MIN_HEIGHT}
      style={{
        backgroundColor,
        borderRadius: "var(--mantine-radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--mantine-spacing-xs)",
      }}
    >
      <Box>
        {prefix && <MetricEyebrow>{prefix}</MetricEyebrow>}
        <Text size="xs" fw={500}>
          {label}
        </Text>
      </Box>
      <Text
        component="div"
        fz={20}
        fw={600}
        mt="auto"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Text>
    </Box>
  );
}
