import type { MantineColor } from "@mantine/core";
import type { ReactNode } from "react";
import {
  relifeConcepts,
  type ConceptId,
  type ConceptPrefix,
} from "../../constants/relifeConcepts";
import { ConceptLabel } from "./ConceptLabel";
import { MetricCard } from "./MetricCard";

interface ConceptMetricCardProps {
  conceptId: ConceptId;
  value: ReactNode;
  /** Set when `value` is a bare number, so the concept's unit follows it. */
  withUnit?: boolean;
  valueColor?: MantineColor;
  descriptionVisible?: boolean;
  variant?: "default" | "highlight";
  /**
   * Qualifier such as "Total" or "Portfolio". Rendered as an eyebrow above the
   * concept label rather than inline before it.
   */
  prefix?: ConceptPrefix;
  footer?: ReactNode;
}

/** The metric tile of every results screen: a concept, its value, its detail. */
export function ConceptMetricCard({
  conceptId,
  value,
  withUnit = false,
  valueColor,
  descriptionVisible = false,
  variant = "default",
  prefix,
  footer,
}: ConceptMetricCardProps) {
  return (
    <MetricCard
      label={
        // The unit sits beside the value, never in the label, so the two
        // cannot disagree and the label stays on one line.
        <ConceptLabel
          conceptId={conceptId}
          descriptionVisible={descriptionVisible}
          withUnit={false}
          size="xs"
        />
      }
      value={value}
      unit={withUnit ? relifeConcepts[conceptId].unit : undefined}
      valueColor={valueColor}
      variant={variant}
      prefix={prefix}
      footer={footer}
    />
  );
}
