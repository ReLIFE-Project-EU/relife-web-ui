/**
 * Portfolio Manager container component.
 * Combines all portfolio management functionality into a single component.
 */

import {
  Alert,
  Badge,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconFileUpload,
  IconFolder,
  IconFolderOpen,
} from "@tabler/icons-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { FileList } from "./FileList";
import { FileUploader } from "./FileUploader";
import { PortfolioSelector } from "./PortfolioSelector";
import { QuotaIndicator } from "./QuotaIndicator";

function PortfolioManagerContent() {
  const { state, currentPortfolio } = usePortfolio();

  return (
    <Stack gap="lg">
      {state.error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          withCloseButton
          onClose={() => {}}
        >
          {state.error}
        </Alert>
      )}

      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={42} radius="md" variant="light" color="teal">
              <IconFolder size={22} />
            </ThemeIcon>
            <div>
              <Title order={3}>Portfolio Workspace</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Create, rename, and switch between stored portfolios before
                uploading files.
              </Text>
            </div>
          </Group>
          {currentPortfolio && (
            <Badge color="teal" variant="light">
              Active: {currentPortfolio.name}
            </Badge>
          )}
        </Group>

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Select Portfolio
          </Text>
          <PortfolioSelector />
        </Stack>

        <QuotaIndicator />
      </Stack>

      {currentPortfolio && (
        <Stack gap="md">
          <Divider label="Upload Files" labelPosition="left" />
          <Group justify="space-between" align="flex-start" gap="sm">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={42} radius="md" variant="light" color="teal">
                <IconFileUpload size={22} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Upload to {currentPortfolio.name}</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Add CSV files here. The upload area includes the sample file
                  and CSV reference.
                </Text>
              </div>
            </Group>
            <Badge color="teal" variant="light">
              {currentPortfolio.fileCount} files
            </Badge>
          </Group>
          <FileUploader />
        </Stack>
      )}

      {currentPortfolio && (
        <Stack gap="md">
          <Divider label="Files" labelPosition="left" />
          <Group justify="space-between" align="flex-start" gap="sm">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={42} radius="md" variant="light" color="gray">
                <IconFolderOpen size={22} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Manage uploaded files</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Review uploaded files, then rename, move, download, or delete
                  them as needed.
                </Text>
              </div>
            </Group>
            <Badge color="gray" variant="light">
              {currentPortfolio.fileCount} items
            </Badge>
          </Group>
          <FileList />
        </Stack>
      )}

      {!currentPortfolio && !state.isLoadingPortfolios && (
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={52} radius="xl" variant="light" color="teal">
            <IconFolderOpen size={28} />
          </ThemeIcon>
          <Title order={4}>Choose a portfolio to continue</Title>
          <Text size="sm" c="dimmed" ta="center" maw={520}>
            Create a new portfolio or select an existing one to unlock file
            uploads, CSV guidance, and file management tools.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

export function PortfolioManager() {
  // Note: The provider is wrapped at the route level
  // This component assumes it's already inside a PortfolioProvider
  return <PortfolioManagerContent />;
}
