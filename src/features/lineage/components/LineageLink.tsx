import { useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { IconTimelineEvent } from "@tabler/icons-react";
import { useHref } from "react-router-dom";
import { auditLog } from "../../../utils/auditLogger";
import { errorMessage } from "../../../utils/errorMessage";
import { saveLineageSnapshot } from "../lineageSnapshot";

interface LineageLinkProps {
  scope: "hra";
}

/**
 * Opens the lineage of the tool's latest run in a new tab; debug builds only.
 * A button rather than a link, so every way of opening it saves the run first.
 */
export function LineageLink({ scope }: LineageLinkProps) {
  const [error, setError] = useState<string | null>(null);
  const href = useHref(`/lineage?scope=${scope}`);

  if (!auditLog.debugEnabled) return null;

  const handleClick = () => {
    try {
      saveLineageSnapshot(scope);
      setError(null);
      window.open(href, "_blank", "noopener");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <Group gap="xs">
      <Button
        variant="subtle"
        size="compact-sm"
        leftSection={<IconTimelineEvent size={16} />}
        onClick={handleClick}
      >
        View calculation lineage
      </Button>
      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}
    </Group>
  );
}
