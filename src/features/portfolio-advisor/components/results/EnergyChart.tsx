/**
 * BeforeAfterBars
 * Two-bar before/after chart used for total portfolio energy use.
 */

import { Box, Group, Stack, Text } from "@mantine/core";
import { formatDecimal } from "../../../../utils/formatters";

interface BeforeAfterBarsProps {
  /** Aggregate value before renovation */
  before: number;
  /** Aggregate value after renovation */
  after: number;
  /** Chart pixel height (default 160) */
  height?: number;
  /** Per-bar value formatter (default: MWh from kWh) */
  formatValue?: (raw: number) => string;
}

const defaultFormat = (raw: number) => `${formatDecimal(raw / 1000)} MWh`;

export function EnergyChart({
  before,
  after,
  height = 160,
  formatValue = defaultFormat,
}: BeforeAfterBarsProps) {
  const max = Math.max(before, after, 1);

  return (
    <Stack gap="sm">
      <Box
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          height,
          padding: "0 4px",
        }}
      >
        <Bar
          label="Before"
          value={formatValue(before)}
          ratio={before / max}
          color="var(--mantine-color-gray-3)"
          borderColor="var(--mantine-color-gray-4)"
        />
        <Bar
          label="After"
          value={formatValue(after)}
          ratio={after / max}
          color="var(--mantine-color-relife-7)"
          accentText
        />
      </Box>
    </Stack>
  );
}

function Bar({
  label,
  value,
  ratio,
  color,
  borderColor,
  accentText,
}: {
  label: string;
  value: string;
  ratio: number;
  color: string;
  borderColor?: string;
  accentText?: boolean;
}) {
  return (
    <Group
      align="flex-end"
      style={{ flex: 1, height: "100%" }}
      gap={0}
      justify="center"
    >
      <Stack
        gap={4}
        align="center"
        style={{ flex: 1, height: "100%" }}
        justify="flex-end"
      >
        <Text
          size="xs"
          fw={500}
          c={accentText ? "relife.8" : "dimmed"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Text>
        <Box
          style={{
            width: "100%",
            height: `${ratio * 100}%`,
            minHeight: 4,
            backgroundColor: color,
            border: borderColor ? `1px solid ${borderColor}` : undefined,
            borderRadius: "4px 4px 0 0",
          }}
        />
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Stack>
    </Group>
  );
}
