/**
 * Upload progress indicator for files being uploaded.
 */

import {
  ActionIcon,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconUpload, IconX } from "@tabler/icons-react";
import type { UploadProgress as UploadProgressType } from "../../types";

interface UploadProgressProps {
  uploads: UploadProgressType[];
  onClear: () => void;
}

export function UploadProgress({ uploads, onClear }: UploadProgressProps) {
  if (uploads.length === 0) return null;

  const hasCompleted = uploads.some(
    (u) => u.status === "complete" || u.status === "error",
  );

  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Uploads ({uploads.length})
          </Text>
          {hasCompleted && (
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={onClear}
              title="Clear completed"
            >
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>

        {uploads.map((upload) => (
          <Group key={upload.fileId} gap="sm" wrap="nowrap">
            {upload.status === "complete" ? (
              <ThemeIcon size="sm" color="green" variant="light">
                <IconCheck size={12} />
              </ThemeIcon>
            ) : upload.status === "error" ? (
              <ThemeIcon size="sm" color="red" variant="light">
                <IconX size={12} />
              </ThemeIcon>
            ) : (
              <ThemeIcon size="sm" color="blue" variant="light">
                <IconUpload size={12} />
              </ThemeIcon>
            )}

            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" truncate>
                {upload.filename}
              </Text>
              {upload.status === "error" ? (
                <Text size="xs" c="red">
                  {upload.error}
                </Text>
              ) : (
                <Progress
                  value={upload.progress}
                  size="xs"
                  color={upload.status === "complete" ? "green" : "blue"}
                  animated={upload.status === "uploading"}
                />
              )}
            </Stack>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
