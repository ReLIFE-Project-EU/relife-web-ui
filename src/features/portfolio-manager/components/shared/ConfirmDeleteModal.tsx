/**
 * Confirmation modal for delete operations.
 */

import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ConfirmDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Group gap="sm" align="flex-start">
          <IconAlertTriangle size={24} color="var(--mantine-color-red-6)" />
          <Text size="sm" style={{ flex: 1 }}>
            {message}
          </Text>
        </Group>

        <Text size="sm" fw={500} c="dimmed">
          Item to delete:{" "}
          <Text span fw={700}>
            {itemName}
          </Text>
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
