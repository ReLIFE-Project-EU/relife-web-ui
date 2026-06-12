import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconChartAreaLine,
  IconChartBar,
  IconPresentation,
  IconRefresh,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useSyncGlobalLoading } from "../../contexts/global-loading";
import { useWizardStepScroll } from "../../hooks/useWizardStepScroll";
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
            color={canAccessStep(0) ? "relife" : "gray"}
          >
            {currentStep === 0 && <PortfolioStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Goal"
            description="Choose objective"
            icon={<IconChartAreaLine size={18} />}
            color={canAccessStep(1) ? "relife" : "gray"}
          >
            {currentStep === 1 && <GoalStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Packages"
            description="Compare strategies"
            icon={<IconPresentation size={18} />}
            loading={state.isRunningWorkflow}
            color={canAccessStep(2) ? "relife" : "gray"}
          >
            {currentStep === 2 && <PackagesStep />}
          </Stepper.Step>

          <Stepper.Step
            label="Results"
            description="View rankings"
            icon={<IconChartBar size={18} />}
            color={canAccessStep(3) ? "relife" : "gray"}
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
