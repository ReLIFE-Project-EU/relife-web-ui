/**
 * MetricCard Component
 * Displays a metric with label and value in a styled card.
 *
 * Label, value and footer sit on three rows shared with the parent grid, so
 * cards in one row line up their values whatever the label heights.
 */

import { Box, Text, type MantineColor } from "@mantine/core";
import type { ReactNode } from "react";
import { MetricEyebrow } from "./MetricEyebrow";

/** Keeps a row of cards the same size when some have no footer. */
const METRIC_CARD_MIN_HEIGHT = 96;
/** Label, value, footer. */
const CARD_ROWS = 3;

interface MetricCardProps {
  /** Label describing the metric (string or React node for inline icons) */
  label: ReactNode;
  /** Formatted value to display (string or React node) */
  value: ReactNode;
  /** Unit shown beside the value, for values that are bare numbers */
  unit?: string;
  /** Only for gain or loss; neutral otherwise */
  valueColor?: MantineColor;
  /** Optional variant for different visual styles */
  variant?: "default" | "highlight";
  /** Qualifier shown as an uppercase eyebrow above the label */
  prefix?: string;
  /** Detail under the value: a comparison, a range or a hint */
  footer?: ReactNode;
}

export function MetricCard({
  label,
  value,
  unit,
  valueColor,
  variant = "default",
  prefix,
  footer,
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
        display: "grid",
        gridTemplateRows: "subgrid",
        gridRow: `span ${CARD_ROWS}`,
        alignContent: "start",
        rowGap: "var(--mantine-spacing-xs)",
      }}
    >
      <Box>
        {prefix && <MetricEyebrow>{prefix}</MetricEyebrow>}
        {typeof label === "string" || typeof label === "number" ? (
          <Text size="xs" fw={500}>
            {label}
          </Text>
        ) : (
          label
        )}
      </Box>
      <Text
        component="div"
        fz={20}
        fw={600}
        c={valueColor}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {unit ? (
          <Text span fz="xs" fw={400} c="dimmed">
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
      {typeof footer === "string" ? (
        <Text size="xs" c="dimmed">
          {footer}
        </Text>
      ) : (
        footer
      )}
    </Box>
  );
}
