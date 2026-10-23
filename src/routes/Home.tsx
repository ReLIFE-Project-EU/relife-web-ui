import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBriefcase,
  IconBuildingEstate,
  IconHomeHeart,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const tools = [
  {
    title: "Renovation Strategy Explorer",
    badge: "Policymakers & Researchers",
    description:
      "Compare renovation packages for representative building stock against budget, energy, or emissions goals.",
    icon: IconBuildingEstate,
    link: "/strategy-explorer",
    color: "blue",
  },
  {
    title: "Portfolio Renovation Advisor",
    badge: "Financial Institutions & ESCOs",
    description:
      "Estimate renovation costs, energy savings, and financial returns across your buildings.",
    icon: IconBriefcase,
    link: "/portfolio-advisor",
    color: "teal",
  },
  {
    title: "Home Renovation Assistant",
    badge: "Homeowners",
    description:
      "Compare renovation options and estimate costs and energy savings for your home.",
    icon: IconHomeHeart,
    link: "/home-assistant",
    color: "orange",
  },
];

export const Home = () => {
  const navigate = useNavigate();

  return (
    <Box pb={80}>
      {/* Hero Section */}
      <Box
        bg="var(--mantine-color-gray-0)"
        py={{ base: 60, md: 100 }}
        ml="lg"
        mr="lg"
        style={{ borderRadius: "2rem" }}
      >
        <Container size="lg">
          <Stack align="center" gap="xl" ta="center">
            <Box>
              <Text
                c="relife.7"
                fw={700}
                tt="uppercase"
                mb="sm"
                style={{ fontSize: rem(14), letterSpacing: rem(1) }}
              >
                ReLIFE Platform
              </Text>
              <Title
                order={1}
                fz={{ base: 36, sm: 48, md: 60 }}
                fw={900}
                lh={1.1}
              >
                Compare building{" "}
                <Text component="span" c="relife.6" inherit>
                  renovation options
                </Text>
              </Title>
            </Box>

            <Text c="dimmed" size="xl" maw={600}>
              Estimate costs and energy savings for a home, a building
              portfolio, or representative building stock.
            </Text>

            <Group justify="center" gap="md">
              <Button
                variant="default"
                size="lg"
                component="a"
                href="https://relife-project.eu/"
                target="_blank"
              >
                About ReLIFE
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Tool Selection Section */}
      <Container size="lg" mt={-40}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {tools.map((tool) => (
            <Card
              key={tool.title}
              padding="xl"
              radius="lg"
              withBorder
              shadow="sm"
              style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => navigate(tool.link)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
              }}
            >
              <ThemeIcon
                size={60}
                radius="md"
                variant="light"
                color={tool.color}
                mb="md"
              >
                <tool.icon size={32} stroke={1.5} />
              </ThemeIcon>
              <Badge color={tool.color} variant="light" mb="sm">
                {tool.badge}
              </Badge>
              <Title order={3} mb="sm">
                {tool.title}
              </Title>
              <Text c="dimmed" mb="xl" style={{ flex: 1 }}>
                {tool.description}
              </Text>
              <Group mt="auto">
                <Text c={tool.color} fw={600} size="sm">
                  View tool
                </Text>
                <IconArrowRight
                  size={16}
                  color={`var(--mantine-color-${tool.color}-6)`}
                />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};
