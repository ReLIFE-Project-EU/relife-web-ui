import { Stack, Text } from "@mantine/core";
import type { ConceptId } from "../../constants/relifeConcepts";
import { relifeConcepts } from "../../constants/relifeConcepts";
import { ConceptExplainer } from "./ConceptExplainer";

interface ConceptLabelProps {
  conceptId: ConceptId;
  descriptionVisible?: boolean;
  withExplainer?: boolean;
  size?: "xs" | "sm" | "md";
}

export function ConceptLabel({
  conceptId,
  descriptionVisible = false,
  withExplainer = true,
  size = "sm",
}: ConceptLabelProps) {
  const concept = relifeConcepts[conceptId];

  return (
    <Stack gap={2}>
      <Text span size={size} fw={500}>
        {concept.label}
        {concept.unit ? (
          <Text span inherit c="dimmed" fw={400}>
            {" "}
            ({concept.unit})
          </Text>
        ) : null}
        {withExplainer ? (
          <>
            {" "}
            <ConceptExplainer conceptId={conceptId} />
          </>
        ) : null}
      </Text>
      {descriptionVisible ? (
        <Text size="xs" c="dimmed">
          {concept.description}
          {concept.caveat ? ` ${concept.caveat}` : ""}
        </Text>
      ) : null}
    </Stack>
  );
}
