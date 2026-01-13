/**
 * Modal for creating a new portfolio.
 */

import {
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";

interface CreatePortfolioModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}

export function CreatePortfolioModal({
  opened,
  onClose,
  onCreate,
}: CreatePortfolioModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
    },
    validate: {
      name: (value: string) => {
        if (!value.trim()) return "Name is required";
        if (value.length > 255) return "Name must be 255 characters or less";
        return null;
      },
    },
  });

  const handleSubmit = async (values: {
    name: string;
    description: string;
  }) => {
    setLoading(true);
    try {
      await onCreate(
        values.name.trim(),
        values.description.trim() || undefined,
      );
      form.reset();
      onClose();
    } catch {
      // Error is handled by the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Portfolio"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Portfolio Name"
            placeholder="e.g., Q1 2026 Analysis"
            required
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description"
            placeholder="Optional description for this portfolio"
            rows={3}
            {...form.getInputProps("description")}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Portfolio
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
