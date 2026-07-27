/**
 * Compact summary of the financing choice applied to a set of results:
 * the financing type, plus the subsidy when one was set.
 *
 * Extracted from the HRA results panel so PRA can show the same summary.
 */

import { Badge, Group } from "@mantine/core";
import { relifeConcepts } from "../../constants/relifeConcepts";
import type { FundingOptions } from "../../types/renovation";
import { formatCurrency, formatPercent } from "../../utils/formatters";

interface FundingPillsProps {
  funding: FundingOptions;
}

export function FundingPills({ funding }: FundingPillsProps) {
  const pills: string[] = [
    funding.financingType === "loan"
      ? relifeConcepts["renovation-loan"].label
      : relifeConcepts["own-funds"].label,
  ];

  const { incentives } = funding;
  if (incentives.mode === "percentage" && incentives.upfrontPercentage > 0) {
    pills.push(`${formatPercent(incentives.upfrontPercentage)} subsidy`);
  } else if (incentives.mode === "amount" && incentives.upfrontAmount > 0) {
    pills.push(`${formatCurrency(incentives.upfrontAmount)} subsidy`);
  }

  return (
    <Group gap={6} wrap="wrap">
      {pills.map((pill) => (
        <Badge key={pill} variant="light" color="blue" radius="sm">
          {pill}
        </Badge>
      ))}
    </Group>
  );
}
