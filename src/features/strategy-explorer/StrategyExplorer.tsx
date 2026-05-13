import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  List,
  Loader,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconChartAreaLine,
  IconChartBar,
  IconMap,
  IconPresentation,
  IconRefresh,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useSyncGlobalLoading } from "../../contexts/global-loading";
import { useWizardStepScroll } from "../../hooks/useWizardStepScroll";
import { relifeConcepts } from "../../constants/relifeConcepts";
import { formatNumber } from "../../utils/formatters";
import { StrategyExplorerProvider } from "./context";
import {
  useCurrentStep,
  useStrategyExplorer,
} from "./hooks/useStrategyExplorer";
import { GoalStep } from "./components/GoalStep";
import { PackagesStep } from "./components/PackagesStep";
import { PortfolioStep } from "./components/PortfolioStep";
import { ResultsStep } from "./components/ResultsStep";

/** Scroll margin used by both the scroll anchor and the sticky summary strip. */
const WIZARD_TOP_SCROLL_MARGIN = 96;

// ─────────────────────────────────────────────────────────────────────────────
// Intro Panel (preserves original landing copy)
// ─────────────────────────────────────────────────────────────────────────────

const plannedFeatures = [
  {
    icon: IconBuildingCommunity,
    title: "Building Stock Analysis",
    description:
      "Analyze national and regional building stock characteristics, typologies, and renovation potential.",
  },
  {
    icon: IconChartAreaLine,
    title: "Regional Projections",
    description:
      "Simulate renovation scenarios across regions with climate projections for 2030 and 2050.",
  },
  {
    icon: IconMap,
    title: "Geographic Insights",
    description:
      "Visualize building stock data and renovation opportunities across different geographic areas.",
  },
  {
    icon: IconPresentation,
    title: "Policy Dashboard",
    description: `Track policy impacts using shared indicators such as ${relifeConcepts["annual-building-thermal-needs"].label.toLowerCase()}, ${relifeConcepts["estimated-epc"].label.toLowerCase()}, and financial outcomes.`,
  },
];

function IntroPanel() {
  return (
    <Stack gap="xl" mb="xl">
      <Box>
        <Badge color="blue" size="lg" mb="md">
          Group 1: Policymakers & Researchers
        </Badge>
        <Title order={1} mb="sm">
          Renovation Strategy Explorer
        </Title>
        <Text c="dimmed" size="lg" maw={700} mb="lg">
          Comprehensive tools for analyzing building stock at national and
          regional levels. Develop evidence-based renovation strategies and
          track policy impacts across Europe.
        </Text>
      </Box>

      <Card withBorder radius="md" p="lg" bg="blue.0">
        <Title order={4} mb="sm">
          Designed for
        </Title>
        <List spacing="xs">
          <List.Item>Policymakers and public authorities</List.Item>
          <List.Item>Urban planners and regional administrators</List.Item>
          <List.Item>Researchers and academic institutions</List.Item>
          <List.Item>Energy agencies and regulatory bodies</List.Item>
        </List>
      </Card>

      <Box>
        <Title order={2} mb="lg">
          Planned Features
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {plannedFeatures.map((feature) => (
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Strip
// ─────────────────────────────────────────────────────────────────────────────

function SummaryStrip() {
  const { state } = useStrategyExplorer();
  const portfolio = state.portfolio;
  const goal = state.goal;
  const packages = state.packageIds;

  const totalBuildings = portfolio.selections.reduce(
    (sum, s) => sum + s.buildingCount,
    0,
  );

  const goalLabel = (() => {
    if (!goal) return "Not selected";
    switch (goal.kind) {
      case "financial":
        return `Financial (≤ ${goal.maxBudgetEur.toLocaleString()} €)`;
      case "energy":
        return "Energy efficiency";
      case "emission":
        return "Emission reduction";
    }
  })();

  const status = (() => {
    if (state.isRunningWorkflow) {
      return { label: "Running…", color: "blue", icon: true };
    }
    if (state.workflowResult) {
      return { label: "Complete", color: "green", icon: false };
    }
    if (state.currentStep > 0) {
      return { label: "In progress", color: "yellow", icon: false };
    }
    return { label: "Not started", color: "gray", icon: false };
  })();

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      style={{
        position: "sticky",
        top: WIZARD_TOP_SCROLL_MARGIN,
        zIndex: 10,
        backgroundColor: "var(--mantine-color-gray-0)",
      }}
    >
      <Group gap={0} grow wrap="nowrap" align="stretch">
        <Cell label="Buildings">
          {totalBuildings > 0 ? (
            formatNumber(totalBuildings)
          ) : (
            <Text c="dimmed" span>
              —
            </Text>
          )}
        </Cell>
        <Cell label="Archetypes">
          {portfolio.selections.length > 0 ? (
            portfolio.selections.length
          ) : (
            <Text c="dimmed" span>
              —
            </Text>
          )}
        </Cell>
        <Cell label="Packages">{packages.length}</Cell>
        <Cell label="Goal">{goalLabel}</Cell>
        <Cell label="Status" alignEnd>
          <Badge
            color={status.color}
            variant="light"
            leftSection={
              status.icon ? (
                <Loader size={10} color={status.color} />
              ) : undefined
            }
          >
            {status.label}
          </Badge>
        </Cell>
      </Group>
    </Card>
  );
}

function Cell({
  label,
  children,
  alignEnd,
}: {
  label: string;
  children: React.ReactNode;
  alignEnd?: boolean;
}) {
  return (
    <Stack
      gap={2}
      px="md"
      py="xs"
      style={{
        borderRight: "1px solid var(--mantine-color-gray-2)",
        minWidth: 0,
      }}
    >
      <Text
        size="10px"
        fw={700}
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </Text>
      <Text
        component="div"
        size="sm"
        fw={600}
        style={{
          fontVariantNumeric: "tabular-nums",
          alignSelf: alignEnd ? "flex-start" : "stretch",
        }}
      >
        {children}
      </Text>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard
// ─────────────────────────────────────────────────────────────────────────────

function StrategyExplorerWizard() {
  const { state, dispatch } = useStrategyExplorer();
  const topRef = useRef<HTMLDivElement | null>(null);
  const currentStep = useCurrentStep();

  useSyncGlobalLoading(state.isRunningWorkflow, "StrategyExplorer.workflow");
  useWizardStepScroll(currentStep, topRef);

  const handleStepClick = (step: number) => {
    if (step <= state.currentStep) {
      dispatch({ type: "SET_STEP", step: step as 0 | 1 | 2 | 3 });
    }
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  const canAccessStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return state.portfolio.selections.length > 0;
      case 2:
        return state.goal !== null;
      case 3:
        return state.workflowResult !== null;
      default:
        return false;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} mb="xs">
              Renovation Strategy Explorer
            </Title>
            <Text c="dimmed" size="lg">
              Public-authority strategy comparison tool
            </Text>
          </div>

          {state.currentStep > 0 && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={16} />}
              onClick={handleReset}
              size="sm"
              disabled={state.isRunningWorkflow}
            >
              Start Over
            </Button>
          )}
        </Group>

        <Box
          ref={topRef}
          aria-hidden
          style={{ scrollMarginTop: WIZARD_TOP_SCROLL_MARGIN }}
        />

        {state.currentStep === 0 && <IntroPanel />}

        <SummaryStrip />

        <Stepper
          active={currentStep}
          onStepClick={handleStepClick}
          allowNextStepsSelect={false}
        >
          <Stepper.Step
            label="Portfolio"
            description="Select archetypes"
            icon={<IconBuildingCommunity size={18} />}
            color={canAccessStep(0) ? "blue" : "gray"}
          >
            {currentStep === 0 && <PortfolioStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Goal"
            description="Choose objective"
            icon={<IconChartAreaLine size={18} />}
            color={canAccessStep(1) ? "blue" : "gray"}
          >
            {currentStep === 1 && <GoalStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Packages"
            description="Compare strategies"
            icon={<IconPresentation size={18} />}
            loading={state.isRunningWorkflow}
            color={canAccessStep(2) ? "blue" : "gray"}
          >
            {currentStep === 2 && <PackagesStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Results"
            description="View rankings"
            icon={<IconChartBar size={18} />}
            color={canAccessStep(3) ? "blue" : "gray"}
          >
            {currentStep === 3 && <ResultsStep />}
          </Stepper.Step>
        </Stepper>
      </Stack>
    </Container>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────

export function StrategyExplorer() {
  return (
    <StrategyExplorerProvider>
      <StrategyExplorerWizard />
    </StrategyExplorerProvider>
  );
}
