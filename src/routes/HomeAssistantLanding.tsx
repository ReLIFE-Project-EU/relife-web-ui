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

const features = [
  {
    icon: IconHome2,
    title: "My Building",
    description:
      "Enter your building details including location, type, systems, and more to estimate energy performance.",
  },
  {
    icon: IconListCheck,
    title: "Renovation Options",
    description:
      "Browse pre-validated renovation packages (Soft, Regular, Deep) with clear explanations of what each includes.",
  },
  {
    icon: IconCoin,
    title: "Cost & Savings",
    description:
      "Configure funding options (loans, subsidies, on-bill) and see financial indicators like NPV, ROI, and payback time.",
  },
  {
    icon: IconBulb,
    title: "Personalized Recommendations",
    description:
      "Get ranked renovation suggestions based on your priorities: comfort, cost savings, or environmental impact.",
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
