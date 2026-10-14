import { useState } from "react";
import { Button, Stack, Text, Tooltip } from "@mantine/core";
import { IconExternalLink, IconTimelineEvent } from "@tabler/icons-react";
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
    <Stack gap="xs" maw="100%" style={{ flexShrink: 0 }}>
      <Tooltip
        label="Inspect the inputs and calculation steps. Opens in a new tab."
        events={{ hover: true, focus: true, touch: false }}
        multiline
        maw={260}
        withArrow
      >
        <Button
          variant="light"
          color="relife"
          size="sm"
          leftSection={<IconTimelineEvent size={16} aria-hidden="true" />}
          rightSection={<IconExternalLink size={14} aria-hidden="true" />}
          aria-label="View calculation lineage (opens in a new tab)"
          vars={() => ({
            root: {
              "--button-color": "var(--mantine-color-relife-9)",
              "--button-bd": "1px solid var(--mantine-color-relife-2)",
            },
          })}
          onClick={handleClick}
        >
          View calculation lineage
        </Button>
      </Tooltip>
      {error && (
        <Text
          size="sm"
          c="red"
          role="alert"
          maw={260}
          style={{ overflowWrap: "anywhere" }}
        >
          {error}
        </Text>
      )}
    </Stack>
  );
}
