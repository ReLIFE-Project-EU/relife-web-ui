/**
 * Portfolio Manager container component.
 * Combines all portfolio management functionality into a single component.
 */

import { Alert, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconFolder } from "@tabler/icons-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { FileList } from "./FileList";
import { FileUploader } from "./FileUploader";
import { PortfolioSelector } from "./PortfolioSelector";
import { QuotaIndicator } from "./QuotaIndicator";

function PortfolioManagerContent() {
  const { state, currentPortfolio } = usePortfolio();

  return (
    <Stack gap="lg">
      {/* Error Alert */}
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

      {/* Header */}
      <Stack gap="xs">
        <Title order={3}>
          <IconFolder
            size={24}
            style={{ marginRight: 8, verticalAlign: "middle" }}
          />
          Portfolio Manager
        </Title>
        <Text size="sm" c="dimmed">
          Organize your building data files into portfolios. Upload CSV files.
        </Text>
      </Stack>

      {/* Storage Quota */}
      <QuotaIndicator />

      {/* Portfolio Selection */}
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Select Portfolio
        </Text>
        <PortfolioSelector />
      </Stack>

      {/* File Upload (only show when portfolio is selected) */}
      {currentPortfolio && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Upload Files to "{currentPortfolio.name}"
          </Text>
          <FileUploader />
        </Stack>
      )}

      {/* File List (only show when portfolio is selected) */}
      {currentPortfolio && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Files ({currentPortfolio.fileCount})
          </Text>
          <FileList />
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
