import { Stack, Text, Title } from "@mantine/core";

export const Home = () => {
  return (
    <Stack align="center" gap="lg">
      <Title order={1}>Welcome to ReLIFE Platform</Title>
      <Text size="lg" c="dimmed">
        A comprehensive platform for financial analysis, technical indicators,
        and forecasting
      </Text>
    </Stack>
  );
};
