/**
 * File action buttons and menu.
 */

import {
  ActionIcon,
  Menu,
  Select,
  TextInput,
  Group,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconFolderShare,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { usePortfolio } from "../../hooks/usePortfolio";
import type { PortfolioFile } from "../../types";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";

interface FileActionsProps {
  file: PortfolioFile;
  onDownload: (file: PortfolioFile) => Promise<void>;
  onRename: (fileId: string, newFilename: string) => Promise<void>;
  onMove: (fileId: string, toPortfolioId: string) => Promise<void>;
  onDelete: (file: PortfolioFile) => Promise<void>;
}

export function FileActions({
  file,
  onDownload,
  onRename,
  onMove,
  onDelete,
}: FileActionsProps) {
  const { state } = usePortfolio();
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [renameMode, setRenameMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [targetPortfolioId, setTargetPortfolioId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Other portfolios to move to
  const otherPortfolios = state.portfolios.filter(
    (p) => p.id !== file.portfolioId,
  );

  const handleStartRename = () => {
    setNewFilename(file.originalFilename);
    setRenameMode(true);
  };

  const handleConfirmRename = async () => {
    if (!newFilename.trim()) return;
    setLoading(true);
    try {
      await onRename(file.id, newFilename.trim());
      setRenameMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMove = () => {
    setTargetPortfolioId(null);
    setMoveMode(true);
  };

  const handleConfirmMove = async () => {
    if (!targetPortfolioId) return;
    setLoading(true);
    try {
      await onMove(file.id, targetPortfolioId);
      setMoveMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      await onDelete(file);
      closeDelete();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    await onDownload(file);
  };

  if (renameMode) {
    return (
      <Group gap="xs" wrap="nowrap">
        <TextInput
          value={newFilename}
          onChange={(e) => setNewFilename(e.target.value)}
          size="xs"
          style={{ width: 200 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirmRename();
            if (e.key === "Escape") setRenameMode(false);
          }}
          autoFocus
        />
        <Button
          size="xs"
          onClick={handleConfirmRename}
          loading={loading}
          disabled={!newFilename.trim()}
        >
          Save
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => setRenameMode(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </Group>
    );
  }

  if (moveMode) {
    return (
      <Group gap="xs" wrap="nowrap">
        <Select
          placeholder="Select portfolio"
          data={otherPortfolios.map((p) => ({ value: p.id, label: p.name }))}
          value={targetPortfolioId}
          onChange={setTargetPortfolioId}
          size="xs"
          style={{ width: 200 }}
        />
        <Button
          size="xs"
          onClick={handleConfirmMove}
          loading={loading}
          disabled={!targetPortfolioId}
        >
          Move
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => setMoveMode(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </Group>
    );
  }

  return (
    <>
      <Menu shadow="md" position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray">
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconDownload size={14} />}
            onClick={handleDownload}
          >
            Download
          </Menu.Item>
          <Menu.Item
            leftSection={<IconEdit size={14} />}
            onClick={handleStartRename}
          >
            Rename
          </Menu.Item>
          {otherPortfolios.length > 0 && (
            <Menu.Item
              leftSection={<IconFolderShare size={14} />}
              onClick={handleStartMove}
            >
              Move to...
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={openDelete}
          >
            Delete
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <ConfirmDeleteModal
        opened={deleteOpened}
        onClose={closeDelete}
        onConfirm={handleConfirmDelete}
        title="Delete File"
        message="This will permanently delete the file. This action cannot be undone."
        itemName={file.originalFilename}
        loading={loading}
      />
    </>
  );
}
