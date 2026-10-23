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
  IconCalculator,
  IconChartBar,
  IconListDetails,
  IconTool,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { relifeConcepts } from "../constants/relifeConcepts";

const features = [
  {
    icon: IconListDetails,
    title: "Building portfolio",
    description:
      "Add buildings manually or import a CSV from your saved portfolios.",
  },
  {
    icon: IconTool,
    title: "Renovation measures",
    description:
      "Set measures for the whole portfolio or choose them for individual buildings.",
  },
  {
    icon: IconChartBar,
    title: "Financial results and risk",
    description: `Compare ${relifeConcepts.npv.label.toLowerCase()}, ${relifeConcepts.roi.label.toLowerCase()}, and ${relifeConcepts["payback-period"].label.toLowerCase()}. Inspect risk estimates for individual buildings.`,
  },
  {
    icon: IconCalculator,
    title: "Portfolio and building results",
    description:
      "Review portfolio totals and compare individual building results.",
  },
];

export const PortfolioAdvisorLanding = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="teal" size="lg" mb="md">
            Financial Institutions & ESCOs
          </Badge>
          <Title order={1} mb="sm">
            Portfolio Renovation Advisor
          </Title>
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            Assess renovation costs, energy savings, and financial returns for
            each building and your portfolio.
          </Text>
          <Button
            component={Link}
            to="/portfolio-advisor/tool"
            size="lg"
            color="teal"
            rightSection={<IconArrowRight size={18} />}
          >
            Start portfolio analysis
          </Button>
        </Box>

        {/* Target Users */}
        <Card withBorder radius="md" p="lg" bg="teal.0">
          <Title order={4} mb="sm">
            Designed for
          </Title>
          <List spacing="xs">
            <List.Item>Financial institutions and banks</List.Item>
            <List.Item>Energy Service Companies (ESCOs)</List.Item>
            <List.Item>Building owners and managers</List.Item>
            <List.Item>Real estate investment funds</List.Item>
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
                <ThemeIcon size={44} radius="md" variant="light" color="teal">
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
};
