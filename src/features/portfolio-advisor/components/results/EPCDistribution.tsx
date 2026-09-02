/**
 * EPC class distribution across the portfolio, before and after renovation.
 *
 * Shown instead of an average class improvement: averaging class letters treats
 * them as an interval scale they are not, and hides how the stock is spread.
 *
 * One band per state rather than one row per class, so the shift of the whole
 * stock reads at a glance. Segment widths are proportional to the counts.
 */

import { Box, Group, Stack, Text } from "@mantine/core";
import {
  getEPCColorVar,
  getEPCInk,
  getEPCTint,
  occupiedEpcClasses,
} from "../../../../utils/epcUtils";

interface EPCDistributionProps {
  /** Building counts per EPC class before renovation. */
  before: Record<string, number>;
  /** Building counts per EPC class after renovation. */
  after: Record<string, number>;
}

interface Segment {
  epcClass: string;
  count: number;
}

const BAND_HEIGHT = 34;
const LABEL_COLUMN_WIDTH = 52;

function segmentsOf(
  classes: string[],
  counts: Record<string, number>,
): Segment[] {
  return classes
    .map((epcClass) => ({ epcClass, count: counts[epcClass] ?? 0 }))
    .filter(({ count }) => count > 0);
}

function Band({ label, segments }: { label: string; segments: Segment[] }) {
  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px 1fr`,
        gap: "var(--mantine-spacing-sm)",
        alignItems: "center",
      }}
    >
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {segments.length > 0 ? (
        <Group gap={4} wrap="nowrap" style={{ height: BAND_HEIGHT }}>
          {segments.map(({ epcClass, count }) => (
            <Box
              key={epcClass}
              style={{
                // Raw flex-grow factor, so a class holding twice the buildings
                // takes twice the width.
                flex: count,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--mantine-spacing-xs)",
                backgroundColor: getEPCTint(epcClass),
                border: `1px solid ${getEPCColorVar(epcClass)}`,
                borderRadius: "var(--mantine-radius-sm)",
                color: getEPCInk(epcClass),
              }}
            >
              <Text span fz={11} fw={700} c="inherit">
                ~{epcClass}
              </Text>
              <Text
                span
                fz={13}
                fw={600}
                c="inherit"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {count}
              </Text>
            </Box>
          ))}
        </Group>
      ) : (
        <Text size="xs" c="dimmed">
          None
        </Text>
      )}
    </Box>
  );
}

/**
 * Counts repeated as text, because a segment holding one building out of many
 * is too narrow to show its own label.
 */
function Legend({
  classes,
  before,
  after,
}: {
  classes: string[];
  before: Record<string, number>;
  after: Record<string, number>;
}) {
  const entries = classes.flatMap((epcClass) =>
    (
      [
        ["before", before[epcClass] ?? 0],
        ["after", after[epcClass] ?? 0],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([state, count]) => ({ epcClass, state, count })),
  );

  return (
    <Group
      gap="md"
      wrap="wrap"
      pt={4}
      style={{ borderTop: "1px solid var(--mantine-color-gray-1)" }}
    >
      {entries.map(({ epcClass, state, count }) => (
        <Group key={`${epcClass}-${state}`} gap={6} wrap="nowrap">
          <Box
            w={10}
            h={10}
            style={{
              borderRadius: 2,
              backgroundColor: getEPCTint(epcClass),
              border: `1px solid ${getEPCColorVar(epcClass)}`,
            }}
          />
          <Text fz={11} c="dimmed">
            ~{epcClass} · {count} {state}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

export function EPCDistribution({ before, after }: EPCDistributionProps) {
  const classes = occupiedEpcClasses(before, after);

  if (classes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No EPC data available.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Band label="Before" segments={segmentsOf(classes, before)} />
      <Band label="After" segments={segmentsOf(classes, after)} />
      <Legend classes={classes} before={before} after={after} />
    </Stack>
  );
}
