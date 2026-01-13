/**
 * Storage quota indicator component.
 * Shows current usage and maximum quota with color-coded progress bar.
 */

import { Group, Paper, Progress, Skeleton, Stack, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useQuota } from "../../hooks/useQuota";

export function QuotaIndicator() {
  const { quota, getQuotaColor, formatBytes } = useQuota();

  if (!quota) {
    return (
      <Paper withBorder p="sm" radius="md">
        <Skeleton height={40} />
      </Paper>
    );
  }

  const color = getQuotaColor();

  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconDatabase size={16} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">
              Storage Used
            </Text>
          </Group>
          <Text size="sm" fw={500}>
            {formatBytes(quota.usedBytes)} / {formatBytes(quota.maxBytes)}
          </Text>
        </Group>

        <Progress
          value={quota.usedPercentage}
          color={color}
          size="sm"
          radius="xl"
          aria-label="Storage quota usage"
        />

        {quota.usedPercentage >= 90 && (
          <Text size="xs" c="red">
            Storage almost full. Delete files to free up space.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
