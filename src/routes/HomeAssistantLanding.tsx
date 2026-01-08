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
  IconBulb,
  IconCoin,
  IconHome2,
  IconListCheck,
} from "@tabler/icons-react";

const plannedFeatures = [
  {
    icon: IconHome2,
    title: "My Building",
    description:
      "Simple building input with three pathways: select an archetype, enter custom details, or modify an existing template.",
  },
  {
    icon: IconListCheck,
    title: "Renovation Options",
    description:
      "Browse pre-validated renovation packages with clear explanations of what each option includes.",
  },
  {
    icon: IconCoin,
    title: "Cost & Savings",
    description:
      "Understand renovation costs, available funding options, and estimated energy savings in plain language.",
  },
  {
    icon: IconBulb,
    title: "Personalized Recommendations",
    description:
      "Get tailored renovation suggestions based on your priorities: comfort, cost savings, or environmental impact.",
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
          <Text c="dimmed" size="lg" maw={700}>
            Your personal guide to home renovation. Get clear,
            easy-to-understand advice on improving your home's energy
            efficiency, comfort, and value.
          </Text>
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

        {/* Planned Features */}
        <Box>
          <Title order={2} mb="lg">
            Planned Features
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {plannedFeatures.map((feature) => (
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
            This tool provides a simplified interface to building simulation,
            cost and funding information, and scenario ranking. All results are
            presented in plain language with clear recommendations.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};
