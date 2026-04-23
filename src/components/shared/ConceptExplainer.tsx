import { ActionIcon, HoverCard, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ConceptId } from "../../constants/relifeConcepts";
import { relifeConcepts } from "../../constants/relifeConcepts";

interface ConceptExplainerProps {
  conceptId: ConceptId;
  children?: ReactNode;
  professional?: boolean;
}

export function ConceptExplainer({
  conceptId,
  children,
  professional = false,
}: ConceptExplainerProps) {
  const concept = relifeConcepts[conceptId];

  return (
    <HoverCard width={300} shadow="md" position="top-start" withArrow>
      <HoverCard.Target>
        {children ?? (
          <ActionIcon
            component="span"
            variant="subtle"
            size="xs"
            color="gray"
            aria-label={`Explain ${concept.label.toLowerCase()}`}
            style={{ verticalAlign: "text-bottom" }}
          >
            <IconInfoCircle size={13} />
          </ActionIcon>
        )}
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap={4}>
          <Text size="xs" fw={600}>
            {concept.label}
            {concept.unit ? ` (${concept.unit})` : ""}
          </Text>
          <Text size="xs">{concept.description}</Text>
          {concept.caveat ? (
            <Text size="xs" c="dimmed">
              {concept.caveat}
            </Text>
          ) : null}
          {professional && concept.professionalDetail ? (
            <Text size="xs" c="dimmed" fs="italic">
              {concept.professionalDetail}
            </Text>
          ) : null}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
