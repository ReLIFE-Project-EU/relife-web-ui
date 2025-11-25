import { Container, Stack, Text, Title } from "@mantine/core";

export const TechnicalAnalysis = () => {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Technical Analysis</Title>
          <Text size="lg" c="dimmed">
            Advanced technical indicators and charting tools
          </Text>
        </div>
      </Stack>
    </Container>
  );
};
