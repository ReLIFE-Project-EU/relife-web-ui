/**
 * MetricCard Component
 * Displays a metric with label and value in a styled card.
 */

import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface MetricCardProps {
  /** Label describing the metric */
  label: string;
  /** Formatted value to display (string or React node) */
  value: ReactNode;
  /** Optional variant for different visual styles */
  variant?: "default" | "highlight";
}

export function MetricCard({
  label,
  value,
  variant = "default",
}: MetricCardProps) {
  const backgroundColor =
    variant === "highlight"
      ? "var(--mantine-color-blue-0)"
      : "var(--mantine-color-gray-0)";

  return (
    <Box
      p="md"
      style={{
        backgroundColor,
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Text size="xs" c="dimmed" mb={4}>
        {label}
      </Text>
      <Text size="lg" fw={600}>
        {value}
      </Text>
    </Box>
  );
}
