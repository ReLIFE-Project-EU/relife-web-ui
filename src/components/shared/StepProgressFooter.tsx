/**
 * StepProgressFooter Component
 * Sticky footer combining a section-completion progress indicator with the
 * primary forward action of a wizard step. Use as an alternative to
 * StepNavigation when a step has multiple sub-sections.
 */

import { Button, Group, Paper, Text } from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChecks,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

interface StepProgressFooterProps {
  completedCount: number;
  totalCount: number;
  /** Hint shown next to the progress text. Auto-defaults if omitted. */
  hint?: ReactNode;
  /** Label for the primary action button. */
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  isLoading?: boolean;
  /** Optional left-side secondary action (e.g. previous step). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function StepProgressFooter({
  completedCount,
  totalCount,
  hint,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  isLoading = false,
  secondaryLabel,
  onSecondary,
}: StepProgressFooterProps) {
  const allDone = completedCount >= totalCount;

  const defaultHint = allDone ? (
    <Group gap={4} wrap="nowrap">
      <IconCircleCheck
        size={14}
        color="var(--mantine-color-relife-7)"
        stroke={2}
      />
      <Text size="xs" c="dimmed">
        All set — ready to continue.
      </Text>
    </Group>
  ) : (
    <Text size="xs" c="dimmed">
      Finish the remaining sections to continue.
    </Text>
  );

  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      p="sm"
      mt="md"
      style={{ position: "sticky", bottom: 16, zIndex: 3 }}
    >
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <IconChecks
              size={16}
              color="var(--mantine-color-dimmed)"
              stroke={1.75}
            />
            <Text size="sm">
              <Text component="span" fw={600}>
                {completedCount}/{totalCount}
              </Text>{" "}
              <Text component="span" c="dimmed">
                sections complete
              </Text>
            </Text>
          </Group>
          {hint ?? defaultHint}
        </Group>

        <Group gap="xs">
          {secondaryLabel && onSecondary && (
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onSecondary}
              disabled={isLoading}
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            rightSection={<IconArrowRight size={16} />}
            onClick={onPrimary}
            loading={isLoading}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
