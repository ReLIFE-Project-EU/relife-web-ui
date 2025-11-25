import { Container, Stack, Text, Title } from "@mantine/core";

export const Forecasting = () => {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Forecasting</Title>
          <Text size="lg" c="dimmed">
            Predictive analytics and forecasting models
          </Text>
        </div>
      </Stack>
    </Container>
  );
};
