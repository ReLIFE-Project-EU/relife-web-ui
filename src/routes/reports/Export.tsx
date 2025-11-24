import { Stack, Text, Title } from "@mantine/core";

export const ExportData = () => {
  return (
    <Stack gap="lg">
      <Title order={1}>Export Data</Title>
      <Text size="lg" c="dimmed">
        Export your data in various formats
      </Text>
    </Stack>
  );
};
