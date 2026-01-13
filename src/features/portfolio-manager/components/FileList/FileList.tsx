/**
 * File list component showing files in the current portfolio.
 */

import { Group, Paper, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconFolderOpen } from "@tabler/icons-react";
import { getFileTypeLabel } from "../../constants";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useQuota } from "../../hooks/useQuota";
import type { PortfolioFile } from "../../types";
import { FileIcon } from "../shared/FileIcon";
import { FileActions } from "./FileActions";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FileList() {
  const {
    files,
    isLoadingFiles,
    downloadFile,
    renameFile,
    moveFile,
    deleteFile,
  } = useFileUpload();
  const { formatBytes } = useQuota();

  if (isLoadingFiles) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      </Paper>
    );
  }

  if (files.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <IconFolderOpen
            size={48}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
          <Text c="dimmed" ta="center">
            No files in this portfolio yet.
            <br />
            Upload files using the dropzone above.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const rows = files.map((file: PortfolioFile) => (
    <Table.Tr key={file.id}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <FileIcon mimeType={file.mimeType} />
          <div style={{ minWidth: 0 }}>
            <Text size="sm" truncate fw={500}>
              {file.originalFilename}
            </Text>
            <Text size="xs" c="dimmed">
              {getFileTypeLabel(file.mimeType)}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatBytes(file.fileSize)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {formatDate(file.createdAt)}
        </Text>
      </Table.Td>
      <Table.Td>
        <FileActions
          file={file}
          onDownload={downloadFile}
          onRename={renameFile}
          onMove={moveFile}
          onDelete={deleteFile}
        />
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder radius="md">
      <Table.ScrollContainer minWidth={500}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>File</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Uploaded</Table.Th>
              <Table.Th style={{ width: 60 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
