/**
 * RiskGauge Component
 * Displays success probability as a visual gauge with color-coded risk levels.
 */

import { Card, Group, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconShieldCheck,
  IconAlertTriangle,
  IconAlertCircle,
} from "@tabler/icons-react";
import { MetricExplainer } from "../shared/MetricExplainer";

interface RiskGaugeProps {
  /** Success rate as a decimal (0-1) */
  successRate: number;
  /** Whether to show in compact mode */
  compact?: boolean;
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
      description: "High confidence in positive returns",
    };
  }
  if (percentage >= 60) {
    return {
      color: "yellow",
      label: "Moderate Risk",
      icon: IconAlertTriangle,
      description: "Good chance of positive returns",
    };
  }
  return {
    color: "red",
    label: "Higher Risk",
    icon: IconAlertCircle,
    description: "Consider reviewing the renovation plan",
  };
}

export function RiskGauge({ successRate, compact = false }: RiskGaugeProps) {
  const percentage = Math.round(successRate * 100);
  const risk = getRiskLevel(percentage);
  const Icon = risk.icon;

  if (compact) {
    return (
      <Group gap="xs" wrap="nowrap">
        <Progress
          value={percentage}
          color={risk.color}
          size="lg"
          style={{ flex: 1, minWidth: 60 }}
        />
        <Text size="sm" fw={600} c={`${risk.color}.7`}>
          {percentage}%
        </Text>
      </Group>
    );
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        {/* Header */}
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            Success Probability
          </Text>
          <MetricExplainer metric="SuccessRate" />
        </Group>

        {/* Main gauge */}
        <Group gap="md" align="center" wrap="nowrap">
          <ThemeIcon size="xl" radius="xl" color={risk.color} variant="light">
            <Icon size={24} />
          </ThemeIcon>
          <Stack gap={4} style={{ flex: 1 }}>
            <Group justify="space-between" align="baseline">
              <Text size="xl" fw={700} c={`${risk.color}.7`}>
                {percentage}%
              </Text>
              <Text size="sm" fw={500} c={`${risk.color}.6`}>
                {risk.label}
              </Text>
            </Group>
            <Progress
              value={percentage}
              color={risk.color}
              size="lg"
              radius="xl"
            />
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
