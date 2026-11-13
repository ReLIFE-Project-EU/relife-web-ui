import {
  Badge,
  Box,
  Button,
  Card,
  Container,
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
import { RELIFE_TOOLS } from "../constants/tools";

const tool = RELIFE_TOOLS.find((entry) => entry.link === "/strategy-explorer")!;

const features = [
  {
    icon: IconListDetails,
    title: "Building stock",
    description:
      "Select reference buildings by country and type, then enter how many properties each represents.",
  },
  {
    icon: IconTarget,
    title: "Renovation goal",
    description:
      "Focus on renovating within a budget, saving primary energy, or reducing CO₂ emissions.",
  },
  {
    icon: IconBuildingCommunity,
    title: "Renovation packages",
    description: "Compare predefined packages.",
  },
  {
    icon: IconChartBar,
    title: "Ranked results",
    description: `Compare ${relifeConcepts.investment.label.toLowerCase()}, ${relifeConcepts["rse-total-energy-savings"].label.toLowerCase()}, and ${relifeConcepts["rse-total-co2-reduction"].label.replace("Total", "total")}. See how many ${relifeConcepts["modeled-property"].unit} your budget covers.`,
  },
];

export function StrategyExplorerLanding() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="blue" size="lg" mb="md">
            Policymakers & Researchers
          </Badge>
          <Title order={1} mb="sm">
            Renovation Strategy Explorer
          </Title>
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            {tool.description}
          </Text>
          <Button
            component={Link}
            to="/strategy-explorer/tool"
            size="lg"
            color="blue"
            rightSection={<IconArrowRight size={18} />}
          >
            Compare strategies
          </Button>
        </Box>

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
