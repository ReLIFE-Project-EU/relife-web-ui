/**
 * GlobalLoadingOverlay Component
 *
 * Application-wide loading overlay that renders in a Portal
 * with fixed positioning to cover the entire viewport.
 */

import { Box, Loader, Paper, Portal, Stack, Text } from "@mantine/core";
import {
  Badge,
  Divider,
  Group,
  List,
  ThemeIcon,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconClockHour4 } from "@tabler/icons-react";
import { useGlobalLoadingState } from "../contexts/global-loading";
import { getFriendlyLoadingMessages } from "../contexts/global-loading/loadingMessages";

/**
 * GlobalLoadingOverlay
 *
 * Displays a full-screen loading overlay when any loading operation is active.
 * Uses Portal to render outside the normal DOM hierarchy, ensuring it covers
 * all other content including modals and fixed elements.
 *
 * Place this component once at the application level (e.g., in Layout).
 */
export function GlobalLoadingOverlay() {
  const { isLoading, sources } = useGlobalLoadingState();
  const theme = useMantineTheme();

  if (!isLoading) {
    return null;
  }

  const messages = getFriendlyLoadingMessages(sources);
  const waitingCount = messages.length;

  return (
    <Portal>
      <Box
        role="status"
        aria-live="polite"
        aria-busy={isLoading}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.94) 100%)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.md,
        }}
      >
        <Paper
          shadow="xl"
          radius="lg"
          p="xl"
          maw={720}
          w="100%"
          withBorder
          style={{
            borderColor: theme.colors.gray[2],
          }}
        >
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                  variant="light"
                  color="relife"
                  size={36}
                  radius="xl"
                  aria-hidden
                >
                  <Loader size={16} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Finalizing your request</Title>
                  <Text c="dimmed" size="sm">
                    Please keep this page open while we complete the analysis.
                  </Text>
                </div>
              </Group>
              <Badge variant="light" color="relife" size="lg">
                In Progress
              </Badge>
            </Group>

            <Divider />

            <Stack gap={6}>
              <Text c="dimmed" size="sm">
                We are currently waiting for the following step
                {waitingCount === 1 ? "" : "s"}:
              </Text>
              <List
                spacing="xs"
                icon={
                  <ThemeIcon
                    color="relife"
                    variant="light"
                    size={22}
                    radius="xl"
                  >
                    <IconClockHour4 size={14} />
                  </ThemeIcon>
                }
              >
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <List.Item key={message.id}>
                      <Text size="sm">{message.text}</Text>
                    </List.Item>
                  ))
                ) : (
                  <List.Item>
                    <Text size="sm">Preparing your analysis</Text>
                  </List.Item>
                )}
              </List>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Portal>
  );
}
