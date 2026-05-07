import { Box, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { ConceptId } from "../../constants/relifeConcepts";
import { ConceptLabel } from "./ConceptLabel";

interface ConceptMetricCardProps {
  conceptId: ConceptId;
  value: ReactNode;
  descriptionVisible?: boolean;
  variant?: "default" | "highlight";
  prefix?: string;
}

export function ConceptMetricCard({
  conceptId,
  value,
  descriptionVisible = false,
  variant = "default",
  prefix,
}: ConceptMetricCardProps) {
  const backgroundColor =
    variant === "highlight"
      ? "var(--mantine-color-blue-0)"
      : "var(--mantine-color-gray-0)";

  return (
    <Box
      p="md"
      style={{
        backgroundColor,
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Stack gap={4}>
        <Group gap={4} wrap="nowrap">
          {prefix && (
            <Text span size="xs" c="dimmed" fw={500}>
              {prefix}
            </Text>
          )}
          <ConceptLabel
            conceptId={conceptId}
            descriptionVisible={descriptionVisible}
            size="xs"
          />
        </Group>
        <Text size="lg" fw={600}>
          {value}
        </Text>
      </Stack>
    </Box>
  );
}
