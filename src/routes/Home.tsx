import {
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
  IconChartPie,
  IconDeviceAnalytics,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "Financial Analysis",
    description:
      "Evaluate investment scenarios, calculate ROI, and assess economic indicators for deep renovation projects.",
    icon: IconChartPie,
    link: "/financial",
    color: "blue",
  },
  {
    title: "Technical Analysis",
    description:
      "Detailed assessment of building performance, energy efficiency ratings, and technical specifications.",
    icon: IconDeviceAnalytics,
    link: "/technical",
    color: "teal",
  },
  {
    title: "Forecasting",
    description:
      "Predict future energy savings, cost reductions, and long-term performance trends using advanced models.",
    icon: IconTrendingUp,
    link: "/forecasting",
    color: "violet",
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
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                Unlocking Data for{" "}
                <Text
                  component="span"
                  c="relife.6"
                  inherit
                  style={{ whiteSpace: "nowrap" }}
                >
                  Deep Renovation
                </Text>
              </Title>
            </Box>

            <Text c="dimmed" size="xl" maw={600}>
              Access ready-to-use resources for financial institutions, energy
              service companies, and building owners to boost renovation rates
              across Europe.
            </Text>

            <Group justify="center" gap="md">
              <Button
                variant="default"
                size="lg"
                component="a"
                href="https://relife-project.eu/"
                target="_blank"
              >
                Learn More
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Main Tools Section */}
      <Container size="lg" mt={-40}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {features.map((feature) => (
            <Card
              key={feature.title}
              padding="xl"
              radius="lg"
              withBorder
              shadow="sm"
              style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => navigate(feature.link)}
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
                color={feature.color}
                mb="lg"
              >
                <feature.icon size={32} stroke={1.5} />
              </ThemeIcon>
              <Title order={3} mb="sm">
                {feature.title}
              </Title>
              <Text c="dimmed" mb="xl" style={{ flex: 1 }}>
                {feature.description}
              </Text>
              <Group mt="auto">
                <Text c={feature.color} fw={600} size="sm">
                  Open Tool
                </Text>
                <IconArrowRight
                  size={16}
                  color={`var(--mantine-color-${feature.color}-6)`}
                />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};
