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
  IconBulb,
  IconCoin,
  IconHome2,
  IconListCheck,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { relifeConcepts } from "../constants/relifeConcepts";

const features = [
  {
    icon: IconHome2,
    title: "Building Profile",
    description:
      "Place your home on the map, select its type and construction period, then review the matched reference archetype before estimating energy performance.",
  },
  {
    icon: IconListCheck,
    title: "Renovation Options",
    description:
      "Select supported envelope, heating-system, and PV measures. The tool builds comparable packages and asks for package CAPEX and annual maintenance inputs before analysis.",
  },
  {
    icon: IconCoin,
    title: "Funding & Financial Indicators",
    description: `Model self-funded or loan-financed renovation with optional incentives, then compare ${relifeConcepts.npv.label}, ${relifeConcepts.roi.label}, and ${relifeConcepts["payback-period"].label} when available.`,
  },
  {
    icon: IconBulb,
    title: "Priority-Based Ranking",
    description: `Rank comparable packages using the selected ${relifeConcepts["priority-profile"].label.toLowerCase()}: Environmentally Conscious, Comfort-Driven, or Cost-Optimization Oriented.`,
  },
];

export const HomeAssistantLanding = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="orange" size="lg" mb="md">
            Group 3: Homeowners
          </Badge>
          <Title order={1} mb="sm">
            Home Renovation Assistant
          </Title>
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            Your personal guide to home renovation. Get clear,
            easy-to-understand advice on improving your home's energy
            efficiency, comfort, and value.
          </Text>
          <Button
            component={Link}
            to="/home-assistant/tool"
            size="lg"
            rightSection={<IconArrowRight size={18} />}
            color="orange"
          >
            Start Renovation Planning
          </Button>
        </Box>

        {/* Target Users */}
        <Card withBorder radius="md" p="lg" bg="orange.0">
          <Title order={4} mb="sm">
            Designed for
          </Title>
          <List spacing="xs">
            <List.Item>Private homeowners</List.Item>
            <List.Item>Tenants interested in energy improvements</List.Item>
            <List.Item>Small-scale building owners</List.Item>
            <List.Item>Anyone exploring home renovation options</List.Item>
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
                <ThemeIcon size={44} radius="md" variant="light" color="orange">
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
