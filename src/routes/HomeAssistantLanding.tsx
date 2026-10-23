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
    title: "Your home",
    description:
      "Add your home's location, type, and construction period to find a reference building for the energy estimate.",
  },
  {
    icon: IconListCheck,
    title: "Renovation options",
    description:
      "Choose insulation, windows, heating, or solar panels. Review the estimated costs for each package.",
  },
  {
    icon: IconCoin,
    title: "Funding and returns",
    description: `Include a loan or subsidy and compare ${relifeConcepts.roi.label.toLowerCase()} and ${relifeConcepts["payback-period"].label.toLowerCase()}.`,
  },
  {
    icon: IconBulb,
    title: "Your priorities",
    description: `Rank packages by your ${relifeConcepts["priority-profile"].label.toLowerCase()}, with a focus on cost, health, or the environment.`,
  },
];

export const HomeAssistantLanding = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Badge color="orange" size="lg" mb="md">
            Homeowners
          </Badge>
          <Title order={1} mb="sm">
            Home Renovation Assistant
          </Title>
          <Text c="dimmed" size="lg" maw={700} mb="lg">
            Compare renovation options for your home, with estimates of costs,
            energy savings, and financial returns.
          </Text>
          <Button
            component={Link}
            to="/home-assistant/tool"
            size="lg"
            rightSection={<IconArrowRight size={18} />}
            color="orange"
          >
            Start planning
          </Button>
        </Box>

        {/* Target Users */}
        <Card withBorder radius="md" p="lg" bg="orange.0">
          <Title order={4} mb="sm">
            Designed for
          </Title>
          <List spacing="xs">
            <List.Item>Homeowners</List.Item>
            <List.Item>Tenants interested in energy improvements</List.Item>
            <List.Item>Small building owners</List.Item>
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
