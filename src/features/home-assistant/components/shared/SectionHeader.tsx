/**
 * SectionHeader Component
 * Displays a consistent section header with icon and label.
 */

import { Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Icon element to display (typically from @tabler/icons-react) */
  icon: ReactNode;
  /** Section label text */
  label: string;
}

export function SectionHeader({ icon, label }: SectionHeaderProps) {
  return (
    <Group gap="xs" mb="sm">
      {icon}
      <Text fw={500} size="sm" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}
