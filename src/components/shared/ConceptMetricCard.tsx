import { Box, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { ConceptId } from "../../constants/relifeConcepts";
import { ConceptLabel } from "./ConceptLabel";

interface ConceptMetricCardProps {
  conceptId: ConceptId;
  value: ReactNode;
  descriptionVisible?: boolean;
  variant?: "default" | "highlight";
}

export function ConceptMetricCard({
  conceptId,
  value,
  descriptionVisible = false,
  variant = "default",
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
        <ConceptLabel
          conceptId={conceptId}
          descriptionVisible={descriptionVisible}
          size="xs"
        />
        <Text size="lg" fw={600}>
          {value}
        </Text>
      </Stack>
    </Box>
  );
}
