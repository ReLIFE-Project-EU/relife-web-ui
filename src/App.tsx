import { Stack, Text, Title } from "@mantine/core";
import { Layout } from "./components/Layout";

function App() {
  return (
    <Layout>
      <Stack align="center" gap="lg" mt="xl">
        <Title order={1}>Welcome to ReLIFE Platform</Title>
        <Text size="lg" c="dimmed">
          A comprehensive platform for financial analysis, technical indicators,
          and forecasting
        </Text>
      </Stack>
    </Layout>
  );
}

export default App;
