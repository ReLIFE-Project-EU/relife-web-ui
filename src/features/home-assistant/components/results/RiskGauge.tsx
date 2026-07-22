/**
 * RiskGauge Component
 * Displays the modeled success probability as a low/moderate/high risk
 * category. Homeowners see the category only, because the exact percentage
 * implies a precision the Monte Carlo simulation does not support. PRA keeps
 * the exact probabilities for professional users.
 */

import { Card, Group, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconShieldCheck,
  IconAlertTriangle,
  IconAlertCircle,
} from "@tabler/icons-react";
import { MetricExplainer } from "../shared";

interface RiskGaugeProps {
  /** Success rate as a decimal (0-1) */
  successRate: number;
}

function getRiskLevel(percentage: number): {
  color: string;
  label: string;
  icon: typeof IconShieldCheck;
  description: string;
} {
  if (percentage >= 80) {
    return {
      color: "green",
      label: "Low Risk",
      icon: IconShieldCheck,
      description: "Most simulated scenarios end profitably",
    };
  }
  if (percentage >= 60) {
    return {
      color: "yellow",
      label: "Moderate Risk",
      icon: IconAlertTriangle,
      description: "A majority of simulated scenarios end profitably",
    };
  }
  return {
    color: "red",
    label: "Higher Risk",
    icon: IconAlertCircle,
    description:
      "Many simulated scenarios do not end profitably — review the plan",
  };
}

export function RiskGauge({ successRate }: RiskGaugeProps) {
  const percentage = Math.round(successRate * 100);
  const risk = getRiskLevel(percentage);
  const Icon = risk.icon;

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        {/* Header */}
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            How likely is this to pay off?
          </Text>
          <MetricExplainer metric="SuccessRate" />
        </Group>

        {/* Category gauge. The bar still encodes the probability; only the
         * number is withheld. */}
        <Group gap="md" align="center" wrap="nowrap">
          <ThemeIcon size="xl" radius="xl" color={risk.color} variant="light">
            <Icon size={24} />
          </ThemeIcon>
          <Stack gap={4} style={{ flex: 1 }}>
            <Text size="lg" fw={700} c={`${risk.color}.7`}>
              {risk.label}
            </Text>
            <Progress
              value={percentage}
              color={risk.color}
              size="lg"
              radius="xl"
            />
            <Text size="xs" c="dimmed">
              {risk.description}
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
