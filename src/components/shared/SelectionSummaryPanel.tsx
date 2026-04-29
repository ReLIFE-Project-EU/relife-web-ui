/**
 * SelectionSummaryPanel Component
 * Sticky right-column summary of the user's selections within a wizard step.
 */

import {
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconClipboardCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface SelectionSummaryItem {
  /** Stable id for React keys. */
  id: string;
  /** Left-side label (e.g., "Country"). */
  label: string;
  /** Right-side value. Falls back to a muted placeholder when missing. */
  value?: ReactNode;
  /** Treat the row as completed (filled icon, brand color). */
  complete?: boolean;
  /** Placeholder text when value is missing. */
  placeholder?: string;
}

interface SelectionSummaryPanelProps {
  /** Card title (defaults to "Selection summary"). */
  title?: string;
  /** Status pill rendered next to the title. */
  status?: ReactNode;
  items: SelectionSummaryItem[];
  /** Optional note slot rendered below the rows. */
  note?: ReactNode;
}

export function SelectionSummaryPanel({
  title = "Selection summary",
  status,
  items,
  note,
}: SelectionSummaryPanelProps) {
  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      style={{ position: "sticky", top: 16 }}
    >
      <Group justify="space-between" align="center" mb="sm">
        <Group gap="xs" align="center">
          <ThemeIcon size="sm" radius="xl" color="relife" variant="light">
            <IconClipboardCheck size={14} />
          </ThemeIcon>
          <Title order={5} fw={600}>
            {title}
          </Title>
        </Group>
        {status}
      </Group>

      <Divider mb="xs" />

      <Stack gap={0}>
        {items.map((item, idx) => (
          <Group
            key={item.id}
            justify="space-between"
            align="center"
            wrap="nowrap"
            py="xs"
            style={
              idx < items.length - 1
                ? {
                    borderBottom:
                      "1px dashed var(--mantine-color-default-border)",
                  }
                : undefined
            }
          >
            <Group gap="xs" wrap="nowrap">
              {item.complete ? (
                <IconCircleCheck
                  size={16}
                  color="var(--mantine-color-relife-7)"
                />
              ) : (
                <IconCircleDashed
                  size={16}
                  color="var(--mantine-color-dimmed)"
                />
              )}
              <Text size="sm" c="dimmed">
                {item.label}
              </Text>
            </Group>
            <Text
              size="sm"
              fw={item.complete ? 600 : 400}
              c={item.complete ? undefined : "dimmed"}
              fs={item.complete ? undefined : "italic"}
              ta="right"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "60%",
              }}
            >
              {item.value ?? item.placeholder ?? "Not set"}
            </Text>
          </Group>
        ))}
      </Stack>

      {note && (
        <>
          <Divider my="sm" />
          {note}
        </>
      )}
    </Card>
  );
}
