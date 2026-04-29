/**
 * StepSectionCard Component
 * Numbered, collapsible card used to group inputs within a wizard step.
 * The number badge swaps to a check icon when the section is marked complete.
 */

import {
  Box,
  Card,
  Collapse,
  Group,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

interface StepSectionCardProps {
  /** 1-based section number shown in the badge when not complete. */
  number: number;
  /** Section title, e.g. "Location". */
  title: string;
  /** Optional secondary line under the title (status, summary). */
  meta?: ReactNode;
  /** Section is complete — badge shows a check and border tints brand. */
  complete?: boolean;
  /** Section is currently the user's focus (visual emphasis). */
  active?: boolean;
  /** Initial open state. Defaults to true. */
  defaultOpen?: boolean;
  /** Section body. */
  children: ReactNode;
}

export function StepSectionCard({
  number,
  title,
  meta,
  complete = false,
  active = false,
  defaultOpen = true,
  children,
}: StepSectionCardProps) {
  const [opened, { toggle }] = useDisclosure(defaultOpen);

  const borderColor = complete
    ? "var(--mantine-color-relife-2)"
    : active
      ? "var(--mantine-color-relife-3)"
      : undefined;

  const badgeColor = complete ? "relife" : active ? "blue" : "gray";
  const badgeVariant = complete || active ? "filled" : "light";

  return (
    <Card
      withBorder
      radius="md"
      padding={0}
      style={borderColor ? { borderColor } : undefined}
    >
      <UnstyledButton
        onClick={toggle}
        aria-expanded={opened}
        style={{ width: "100%", padding: "var(--mantine-spacing-md)" }}
      >
        <Group wrap="nowrap" gap="md" align="center">
          <ThemeIcon
            size={36}
            radius="xl"
            color={badgeColor}
            variant={badgeVariant}
          >
            {complete ? (
              <IconCheck size={18} stroke={2.5} />
            ) : (
              <Text fw={700} size="sm">
                {number}
              </Text>
            )}
          </ThemeIcon>

          <Box style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <Text fw={600} size="md" c="var(--mantine-color-text)">
              {title}
            </Text>
            {meta && (
              <Text size="sm" c="dimmed" mt={2}>
                {meta}
              </Text>
            )}
          </Box>

          {opened ? (
            <IconChevronDown
              size={18}
              stroke={1.75}
              color="var(--mantine-color-dimmed)"
            />
          ) : (
            <IconChevronRight
              size={18}
              stroke={1.75}
              color="var(--mantine-color-dimmed)"
            />
          )}
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Box px="md" pb="md" pt={4}>
          {children}
        </Box>
      </Collapse>
    </Card>
  );
}
