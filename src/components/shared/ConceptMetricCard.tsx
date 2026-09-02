import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { ConceptId } from "../../constants/relifeConcepts";
import { ConceptLabel } from "./ConceptLabel";
import { METRIC_CARD_MIN_HEIGHT } from "./MetricCard";
import { MetricEyebrow } from "./MetricEyebrow";

interface ConceptMetricCardProps {
  conceptId: ConceptId;
  value: ReactNode;
  descriptionVisible?: boolean;
  variant?: "default" | "highlight";
  /**
   * Qualifier such as "Total" or "Portfolio". Rendered as an eyebrow above the
   * concept label rather than inline before it: inline it produced "Total
   * reduction in Annual building thermal needs (kWh thermal/year)" on one
   * wrapping line.
   */
  prefix?: string;
}

export function ConceptMetricCard({
  conceptId,
  value,
  descriptionVisible = false,
  variant = "default",
  prefix,
}: ConceptMetricCardProps) {
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
        <ConceptLabel
          conceptId={conceptId}
          descriptionVisible={descriptionVisible}
          size="xs"
        />
      </Box>
      {/* `value` is a ReactNode, so callers pass elements (see the CO₂
          before/after pair in ResultsStep). Text defaults to a <p>, which
          cannot legally contain them — same as MetricCard. */}
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
