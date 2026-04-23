/**
 * MetricExplainer Component
 * Provides secondary explanations for result metrics from the shared ontology.
 */

import { Box, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  financialMetricConceptIds,
  relifeConcepts,
} from "../../constants/relifeConcepts";

export type FinancialMetricType =
  | "NPV"
  | "PBP"
  | "DPP"
  | "IRR"
  | "ROI"
  | "MonthlyAvgSavings"
  | "SuccessRate"
  | "CAPEX"
  | "ARV"
  | "BreakEven"
  | "EnergyReduction"
  | "EPCClass";

interface MetricExplainerProps {
  metric: FinancialMetricType;
  size?: number;
  children?: ReactNode;
}

export function MetricExplainer({
  metric,
  size = 14,
  children,
}: MetricExplainerProps) {
  const concept = relifeConcepts[financialMetricConceptIds[metric]];

  const tooltipContent = (
    <Box>
      <Box fw={500} mb={4}>
        {concept.label}
        {concept.unit ? ` (${concept.unit})` : ""}
      </Box>
      <Box mb={4}>{concept.description}</Box>
      {concept.caveat ? <Box c="dimmed">{concept.caveat}</Box> : null}
      {concept.professionalDetail ? (
        <Box c="dimmed" fs="italic">
          {concept.professionalDetail}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Tooltip label={tooltipContent} withArrow multiline w={280} position="top">
      {children ?? (
        <IconInfoCircle
          size={size}
          style={{ opacity: 0.5, cursor: "help", flexShrink: 0 }}
        />
      )}
    </Tooltip>
  );
}
