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
  IconScale,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { relifeConcepts } from "../constants/relifeConcepts";

const features = [
  {
    icon: IconListDetails,
    title: "Portfolio Manager",
    description:
      "Input and manage building portfolios with batch CSV import and manual entry.",
  },
  {
    icon: IconCalculator,
    title: "Financial Analysis",
    description: `Professional outputs for ${relifeConcepts.npv.label}, ${relifeConcepts.irr.label}, ${relifeConcepts.roi.label}, ${relifeConcepts["payback-period"].label}, and Monte Carlo risk assessment.`,
  },
  {
    icon: IconScale,
    title: "Recommendation Ranking",
    description: `${relifeConcepts.mcda.description} It balances energy, renewables, sustainability, comfort, and financial viability.`,
  },
  {
    icon: IconChartBar,
    title: "Comparative Analytics",
    description:
      "Compare renovation scenarios across your portfolio with risk profiles and aggregated metrics.",
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
