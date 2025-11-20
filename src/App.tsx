import { Container, Title, Text, Button, Stack } from "@mantine/core";
import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg">
        <Title order={1}>Vite + React + Mantine</Title>
        <Text size="lg">A minimal modern web application</Text>
        <Button onClick={() => setCount((count) => count + 1)}>
          Count is {count}
        </Button>
      </Stack>
    </Container>
  );
}

export default App;
