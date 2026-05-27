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
    title: "Building Portfolio Input",
    description:
      "Add buildings manually or with CSV import, including location, archetype/category, floor area, construction period, floors, and optional per-building cost or measure overrides.",
  },
  {
    icon: IconTool,
    title: "Renovation Package Setup",
    description:
      "Select supported measures for the portfolio, or override them per building, then analyze the resulting renovated scenario for each building.",
  },
  {
    icon: IconChartBar,
    title: "Financial & Risk Outputs",
    description: `Review ${relifeConcepts.npv.label}, ${relifeConcepts.roi.label}, ${relifeConcepts["payback-period"].label}, investment, energy/EPC shifts, and Monte Carlo risk ranges or probabilities when the Financial Service returns them.`,
  },
  {
    icon: IconCalculator,
    title: "Portfolio Summary & Drill-Downs",
    description:
      "Use aggregate metrics, status filters, sortable per-building rows, and drill-down panels to inspect successful, rejected, or failed analyses.",
  },
];

export const PortfolioAdvisorLanding = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="teal" size="lg" mb="md">
            Group 2: Financial Institutions & ESCOs
          </Badge>
          <Title order={1} mb="sm">
            Portfolio Renovation Advisor
          </Title>
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            Professional-grade tools for portfolio-level renovation assessment.
            Evaluate multiple buildings, assess financial viability, and make
            data-driven investment decisions.
          </Text>
          <Button
            component={Link}
            to="/portfolio-advisor/tool"
            size="lg"
            color="teal"
            rightSection={<IconArrowRight size={18} />}
          >
            Start Portfolio Analysis
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
            <List.Item>Large-scale building owners and managers</List.Item>
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
