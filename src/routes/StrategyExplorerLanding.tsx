import {
  Badge,
  Box,
  Button,
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
  IconArrowRight,
  IconBuildingCommunity,
  IconChartBar,
  IconListDetails,
  IconTarget,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { relifeConcepts } from "../constants/relifeConcepts";

const features = [
  {
    icon: IconListDetails,
    title: "Archetype Portfolio Builder",
    description:
      "Select available country/category/archetype combinations and assign building counts to define a representative stock.",
  },
  {
    icon: IconTarget,
    title: "Objective Selection",
    description:
      "Choose the ranking objective: budget-limited renovations, delivered system energy savings, or CO₂ reduction.",
  },
  {
    icon: IconBuildingCommunity,
    title: "Package Comparison",
    description:
      "Select predefined renovation packages; only archetype/package combinations available in the published forecasting cache are included.",
  },
  {
    icon: IconChartBar,
    title: "Ranked Results",
    description: `View goal-specific package rankings with total investment, annual ${relifeConcepts["rse-total-energy-savings"].label.toLowerCase()}, ${relifeConcepts["rse-total-co2-reduction"].label.toLowerCase()}, and buildings within budget where applicable.`,
  },
];

export function StrategyExplorerLanding() {
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
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            Comprehensive tools for analyzing building stock at national and
            regional levels. Develop evidence-based renovation strategies and
            track policy impacts across Europe.
          </Text>
          <Button
            component={Link}
            to="/strategy-explorer/tool"
            size="lg"
            color="blue"
            rightSection={<IconArrowRight size={18} />}
          >
            Start Strategy Analysis
          </Button>
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

        {/* Features */}
        <Box>
          <Title order={2} mb="lg">
            Features
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {features.map((feature) => (
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
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
