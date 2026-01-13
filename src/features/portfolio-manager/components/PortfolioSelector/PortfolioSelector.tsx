/**
 * Portfolio selector component.
 * Dropdown for selecting, creating, and managing portfolios.
 */

import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDotsVertical,
  IconEdit,
  IconFolderPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { usePortfolio } from "../../hooks/usePortfolio";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { CreatePortfolioModal } from "./CreatePortfolioModal";

export function PortfolioSelector() {
  const {
    state,
    currentPortfolio,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    selectPortfolio,
  } = usePortfolio();

  const [createOpened, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [renameMode, setRenameMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // Build select options
  const options = state.portfolios.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.fileCount} files)`,
  }));

  const handleSelectChange = (value: string | null) => {
    selectPortfolio(value);
  };

  const handleStartRename = () => {
    if (currentPortfolio) {
      setNewName(currentPortfolio.name);
      setRenameMode(true);
    }
  };

  const handleConfirmRename = async () => {
    if (!currentPortfolio || !newName.trim()) return;
    setLoading(true);
    try {
      await renamePortfolio(currentPortfolio.id, newName.trim());
      setRenameMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRename = () => {
    setRenameMode(false);
    setNewName("");
  };

  const handleConfirmDelete = async () => {
    if (!currentPortfolio) return;
    setLoading(true);
    try {
      await deletePortfolio(currentPortfolio.id);
      closeDelete();
    } finally {
      setLoading(false);
    }
  };

  if (state.isLoadingPortfolios) {
    return (
      <Stack gap="xs">
        <Skeleton height={36} />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="xs">
        {renameMode && currentPortfolio ? (
          <Group gap="xs">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Portfolio name"
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmRename();
                if (e.key === "Escape") handleCancelRename();
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleConfirmRename}
              loading={loading}
              disabled={!newName.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={handleCancelRename}
              disabled={loading}
            >
              Cancel
            </Button>
          </Group>
        ) : (
          <Group gap="xs">
            <Select
              placeholder="Select a portfolio"
              data={options}
              value={state.currentPortfolioId}
              onChange={handleSelectChange}
              searchable
              clearable={false}
              style={{ flex: 1 }}
              nothingFoundMessage="No portfolios found"
            />

            {currentPortfolio && (
              <Menu shadow="md" position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={handleStartRename}
                  >
                    Rename
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={openDelete}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

            <Button
              variant="light"
              leftSection={<IconFolderPlus size={16} />}
              onClick={openCreate}
            >
              New
            </Button>
          </Group>
        )}

        {state.portfolios.length === 0 && !state.isLoadingPortfolios && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No portfolios yet. Create one to get started.
          </Text>
        )}
      </Stack>

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        opened={createOpened}
        onClose={closeCreate}
        onCreate={createPortfolio}
      />

      {/* Delete Confirmation Modal */}
      {currentPortfolio && (
        <ConfirmDeleteModal
          opened={deleteOpened}
          onClose={closeDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Portfolio"
          message="This will permanently delete the portfolio and all files it contains. This action cannot be undone."
          itemName={currentPortfolio.name}
          loading={loading}
        />
      )}
    </>
  );
}
