import type { ReactNode } from "react";
import type { ConceptId } from "../../constants/relifeConcepts";
import { ConceptLabel } from "./ConceptLabel";
import { MetricCard } from "./MetricCard";

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
  return (
    <MetricCard
      label={
        <ConceptLabel
          conceptId={conceptId}
          descriptionVisible={descriptionVisible}
          size="xs"
        />
      }
      value={value}
      variant={variant}
      prefix={prefix}
    />
  );
}
