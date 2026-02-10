/**
 * FinancingStep Component
 * Step 2: Financing scheme selection and portfolio analysis trigger.
 */

import {
  Badge,
  Box,
  Card,
  Grid,
  Group,
  NumberInput,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
  Button,
} from "@mantine/core";
import { IconCash, IconChartBar } from "@tabler/icons-react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { FINANCING_SCHEMES, type FinancingScheme } from "../../constants";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";

// ─────────────────────────────────────────────────────────────────────────────
// Scheme Card
// ─────────────────────────────────────────────────────────────────────────────

function SchemeCard({
  scheme,
  selected,
  onSelect,
}: {
  scheme: (typeof FINANCING_SCHEMES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const isDisabled = !scheme.supported;

  return (
    <UnstyledButton
      onClick={isDisabled ? undefined : onSelect}
      w="100%"
      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
    >
      <Card
        withBorder
        radius="md"
        p="md"
        style={{
          borderColor: selected ? "var(--mantine-color-teal-6)" : undefined,
          backgroundColor: selected
            ? "var(--mantine-color-teal-0)"
            : isDisabled
              ? "var(--mantine-color-gray-1)"
              : undefined,
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconCash size={18} />
            <Text fw={600} size="sm">
              {scheme.label}
            </Text>
          </Group>
          {!scheme.supported && (
            <Badge size="xs" color="gray" variant="light">
              Coming Soon
            </Badge>
          )}
          {selected && (
            <Badge size="xs" color="teal" variant="filled">
              Selected
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {scheme.description}
        </Text>
      </Card>
    </UnstyledButton>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function FinancingStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const services = usePortfolioAdvisorServices();

  const handleSelectScheme = (scheme: FinancingScheme) => {
    dispatch({ type: "SET_FINANCING_SCHEME", scheme });
  };

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const handleAnalyze = async () => {
    dispatch({ type: "START_ANALYSIS" });

    try {
      const results = await services.portfolioAnalysis.analyzePortfolio(
        state.buildings,
        state.renovation.selectedMeasures,
        state.financingScheme,
        state.funding,
        state.projectLifetime,
        (completed, total, current) => {
          dispatch({
            type: "UPDATE_ANALYSIS_PROGRESS",
            completed,
            total,
            currentBuilding: current,
          });
        },
      );

      // Set all building results
      for (const [id, result] of Object.entries(results)) {
        dispatch({ type: "SET_BUILDING_RESULT", buildingId: id, result });
      }

      dispatch({ type: "ANALYSIS_COMPLETE" });
      dispatch({ type: "SET_STEP", step: 3 });
    } catch (e: unknown) {
      dispatch({
        type: "ANALYSIS_ERROR",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const progressPercent = state.analysisProgress
    ? Math.round(
        (state.analysisProgress.completed / state.analysisProgress.total) * 100,
      )
    : 0;

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Financing Configuration
        </Title>
        <Text c="dimmed" size="sm">
          Select a financing scheme and configure loan terms if applicable.
        </Text>
      </Box>

      {/* Financing Schemes */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Financing Scheme
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {FINANCING_SCHEMES.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              selected={state.financingScheme === scheme.id}
              onSelect={() => handleSelectScheme(scheme.id)}
            />
          ))}
        </SimpleGrid>
      </Card>

      {/* Loan Configuration (visible when debt selected) */}
      {state.financingScheme === "debt" && (
        <Card withBorder radius="md" p="lg">
          <Title order={4} mb="md">
            Loan Configuration
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Loan Percentage (%)"
                value={state.funding.loan.percentage}
                onChange={(val) => {
                  if (typeof val === "number") {
                    dispatch({
                      type: "UPDATE_LOAN",
                      field: "percentage",
                      value: val,
                    });
                  }
                }}
                min={0}
                max={100}
                suffix="%"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Loan Term (years)"
                value={state.funding.loan.duration}
                onChange={(val) => {
                  if (typeof val === "number") {
                    dispatch({
                      type: "UPDATE_LOAN",
                      field: "duration",
                      value: val,
                    });
                  }
                }}
                min={1}
                max={30}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Interest Rate (%)"
                value={state.funding.loan.interestRate * 100}
                onChange={(val) => {
                  if (typeof val === "number") {
                    dispatch({
                      type: "UPDATE_LOAN",
                      field: "interestRate",
                      value: val / 100,
                    });
                  }
                }}
                min={0}
                max={30}
                decimalScale={2}
                suffix="%"
              />
            </Grid.Col>
          </Grid>
        </Card>
      )}

      {/* Analysis Progress */}
      {state.analysisProgress && (
        <Card withBorder radius="md" p="lg">
          <Title order={4} mb="md">
            Analyzing Portfolio...
          </Title>
          <Progress
            value={progressPercent}
            size="lg"
            radius="md"
            mb="sm"
            animated
          />
          <Text size="sm" c="dimmed">
            {state.analysisProgress.completed} / {state.analysisProgress.total}{" "}
            buildings processed
            {state.analysisProgress.currentBuilding &&
              ` - Current: ${state.analysisProgress.currentBuilding}`}
          </Text>
        </Card>
      )}

      {/* Error display */}
      <ErrorAlert error={state.error} title="Analysis Error" />

      {/* Analyze Portfolio button */}
      <Group justify="center">
        <Button
          size="lg"
          color="teal"
          leftSection={<IconChartBar size={20} />}
          onClick={handleAnalyze}
          loading={state.isEvaluating}
          disabled={state.buildings.length === 0}
        >
          Analyze Portfolio ({state.buildings.length} buildings)
        </Button>
      </Group>

      {/* Navigation */}
      <StepNavigation
        currentStep={2}
        totalSteps={4}
        onPrevious={handlePrevious}
        disabled={state.isEvaluating}
      />
    </Stack>
  );
}
