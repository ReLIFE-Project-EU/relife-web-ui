/**
 * DeltaValue Component
 * Displays a value with an optional percentage change indicator.
 */

import { Group, Text, type MantineSize } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconMinus } from "@tabler/icons-react";
import { formatNumber, formatPercentWithSign } from "../../utils/formatters";

interface DeltaValueProps {
  /** The primary value to display */
  value: number;
  /** The percentage change (positive = increase, negative = decrease) */
  delta?: number;
  /** Unit to display after the value (e.g., "kWh", "EUR") */
  unit?: string;
  /** Whether higher values are better (affects color logic) */
  higherIsBetter?: boolean;
  /** Size of the text */
  size?: MantineSize;
  /** Custom formatter for the value */
  formatter?: (value: number) => string;
  /** Whether to show the delta icon */
  showIcon?: boolean;
  /** Whether to show just the delta without the main value */
  deltaOnly?: boolean;
}

export function DeltaValue({
  value,
  delta,
  unit,
  higherIsBetter = false,
  size = "sm",
  formatter = formatNumber,
  showIcon = true,
  deltaOnly = false,
}: DeltaValueProps) {
  // Determine if the change is an improvement
  const isImprovement =
    delta !== undefined &&
    delta !== 0 &&
    (higherIsBetter ? delta > 0 : delta < 0);

  const isPositive = delta !== undefined && delta > 0;
  const isNeutral = delta === undefined || delta === 0;

  // Determine color based on whether it's an improvement
  const deltaColor = isNeutral ? "gray" : isImprovement ? "green" : "red";

  // Select icon
  const DeltaIcon = isNeutral
    ? IconMinus
    : isPositive
      ? IconArrowUp
      : IconArrowDown;

  const iconSize =
    size === "xs" ? 12 : size === "sm" ? 14 : size === "md" ? 16 : 18;

  if (deltaOnly && delta !== undefined) {
    return (
      <Group gap={4} wrap="nowrap">
        {showIcon && (
          <DeltaIcon
            size={iconSize}
            color={`var(--mantine-color-${deltaColor}-6)`}
          />
        )}
        <Text c={deltaColor} size={size} fw={500}>
          {formatPercentWithSign(delta)}
        </Text>
      </Group>
    );
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size={size} fw={500}>
        {formatter(value)}
        {unit && ` ${unit}`}
      </Text>
      {delta !== undefined && delta !== 0 && (
        <Group gap={4} wrap="nowrap">
          {showIcon && (
            <DeltaIcon
              size={iconSize}
              color={`var(--mantine-color-${deltaColor}-6)`}
            />
          )}
          <Text c={deltaColor} size={size === "xs" ? "xs" : "sm"} fw={500}>
            {formatPercentWithSign(delta)}
          </Text>
        </Group>
      )}
    </Group>
  );
}

/**
 * Simplified delta badge for use in tables and compact layouts.
 */
interface DeltaBadgeProps {
  delta: number;
  higherIsBetter?: boolean;
}

export function DeltaBadge({ delta, higherIsBetter = false }: DeltaBadgeProps) {
  if (delta === 0) return null;

  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
  const color = isImprovement ? "green" : "red";

  return (
    <Text c={color} size="sm" fw={600}>
      {formatPercentWithSign(delta)}
    </Text>
  );
}
