import { ActionIcon, Code, Group, Text } from "@mantine/core";
import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { useMemo } from "react";

const FALLBACK_SHA = "unknown";
const FALLBACK_DATE = "unknown";

function formatCommitDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return FALLBACK_DATE;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface DevelopmentVersionNoticeProps {
  onClose: () => void;
}

export const DevelopmentVersionNotice = ({
  onClose,
}: DevelopmentVersionNoticeProps) => {
  const versionInfo = useMemo(() => {
    const sha = __APP_COMMIT_SHA__?.slice(0, 12) || FALLBACK_SHA;
    const date = formatCommitDate(__APP_COMMIT_DATE__);
    return { sha, date };
  }, []);

  return (
    <Group
      h={32}
      px="md"
      justify="space-between"
      wrap="nowrap"
      bg="yellow.1"
      c="dark.8"
    >
      <Group gap="xs" wrap="nowrap">
        <IconInfoCircle size={14} />
        <Text size="xs" truncate>
          The ReLIFE Platform is currently in early development. Version{" "}
          <Code>{versionInfo.sha}</Code> • Commit date {versionInfo.date}
        </Text>
      </Group>
      <ActionIcon
        variant="subtle"
        color="dark"
        size="sm"
        aria-label="Close development notice"
        onClick={onClose}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
};
