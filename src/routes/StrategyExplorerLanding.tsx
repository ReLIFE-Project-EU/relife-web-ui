import {
  Badge,
  Box,
  Card,
  Container,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconChartAreaLine,
  IconMap,
  IconPresentation,
} from "@tabler/icons-react";

const plannedFeatures = [
  {
    icon: IconBuildingCommunity,
    title: "Building Stock Analysis",
    description:
      "Analyze national and regional building stock characteristics, typologies, and renovation potential.",
  },
  {
    icon: IconChartAreaLine,
    title: "Regional Projections",
    description:
      "Simulate renovation scenarios across regions with climate projections for 2030 and 2050.",
  },
  {
    icon: IconMap,
    title: "Geographic Insights",
    description:
      "Visualize building stock data and renovation opportunities across different geographic areas.",
  },
  {
    icon: IconPresentation,
    title: "Policy Dashboard",
    description:
      "Track policy impacts and key performance indicators for renovation strategies.",
  },
];

export const StrategyExplorerLanding = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="blue" size="lg" mb="md">
            Group 1: Policymakers & Researchers
          </Badge>
          <Title order={1} mb="sm">
            Renovation Strategy Explorer
          </Title>
          <Text c="dimmed" size="lg" maw={700}>
            Comprehensive tools for analyzing building stock at national and
            regional levels. Develop evidence-based renovation strategies and
            track policy impacts across Europe.
          </Text>
        </Box>

        {/* Target Users */}
        <Card withBorder radius="md" p="lg" bg="blue.0">
          <Title order={4} mb="sm">
            Designed for
          </Title>
          <List spacing="xs">
            <List.Item>Policymakers and public authorities</List.Item>
            <List.Item>Urban planners and regional administrators</List.Item>
            <List.Item>Researchers and academic institutions</List.Item>
            <List.Item>Energy agencies and regulatory bodies</List.Item>
          </List>
        </Card>

        {/* Planned Features */}
        <Box>
          <Title order={2} mb="lg">
            Planned Features
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {plannedFeatures.map((feature) => (
              <Card key={feature.title} withBorder radius="md" p="lg">
                <ThemeIcon size={44} radius="md" variant="light" color="blue">
                  <feature.icon size={24} />
                </ThemeIcon>
                <Title order={4} mt="md" mb="xs">
                  {feature.title}
                </Title>
                <Text size="sm" c="dimmed">
                  {feature.description}
                </Text>
                <Badge mt="md" color="gray" variant="light">
                  Coming Soon
                </Badge>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* How It Works */}
        <Card withBorder radius="md" p="lg" bg="gray.0">
          <Title order={4} mb="sm">
            How It Works
          </Title>
          <Text size="sm" c="dimmed">
            This tool integrates building stock analysis, scenario simulations
            with climate projections, and economic indicators to enable
            region-level projections and strategy visualization.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};
