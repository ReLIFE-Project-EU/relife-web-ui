/**
 * RiskGauge Component
 * Displays the modeled success probability as a low/moderate/high risk
 * category. Homeowners see the category only, because the exact percentage
 * implies a precision the Monte Carlo simulation does not support. PRA keeps
 * the exact probabilities for professional users.
 */

import { Progress, Stack, Text, type MantineColor } from "@mantine/core";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";

const PERCENT_PER_RATIO = 100;

interface RiskGaugeProps {
  /** Success rate as a decimal (0-1) */
  successRate: number;
}

function getRiskLevel(percentage: number): {
  color: MantineColor;
  label: string;
  description: string;
} {
  if (percentage >= 80) {
    return {
      color: "green",
      label: "Low Risk",
      description: "Most simulated scenarios end profitably",
    };
  }
  if (percentage >= 60) {
    return {
      color: "yellow",
      label: "Moderate Risk",
      description: "A majority of simulated scenarios end profitably",
    };
  }
  return {
    color: "red",
    label: "Higher Risk",
    description:
      "Many simulated scenarios do not end profitably — review the plan",
  };
}

export function RiskGauge({ successRate }: RiskGaugeProps) {
  const percentage = Math.round(successRate * PERCENT_PER_RATIO);
  const risk = getRiskLevel(percentage);

  return (
    <ConceptMetricCard
      conceptId="success-probability"
      value={risk.label}
      footer={
        // The bar still encodes the probability; only the number is withheld.
        <Stack gap={4}>
          <Progress value={percentage} color={risk.color} radius="xl" />
          <Text size="xs" c="dimmed">
            {risk.description}
          </Text>
        </Stack>
      }
    />
  );
}
