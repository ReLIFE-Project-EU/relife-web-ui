import { Container, Stack, Text, Title } from "@mantine/core";
import { ServiceStatus } from "./components/ServiceStatus";

function App() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg">
        <ServiceStatus autoRefresh={30000} />
        <Title order={1}>ReLIFE Platform</Title>
        <Text size="lg">A platform for the ReLIFE project</Text>
      </Stack>
    </Container>
  );
}

export default App;
