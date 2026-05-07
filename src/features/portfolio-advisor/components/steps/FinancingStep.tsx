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
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconCash } from "@tabler/icons-react";
import { memo, useCallback, useMemo } from "react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import { formatCurrency } from "../../../../utils/formatters";
import { FINANCING_SCHEMES, type FinancingScheme } from "../../constants";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";

// ─────────────────────────────────────────────────────────────────────────────
// Scheme Card
// ─────────────────────────────────────────────────────────────────────────────

const SchemeCard = memo(function SchemeCard({
  scheme,
  schemeId,
  selected,
  onSelect,
}: {
  scheme: (typeof FINANCING_SCHEMES)[number];
  schemeId: FinancingScheme;
  selected: boolean;
  onSelect: (schemeId: FinancingScheme) => void;
}) {
  const isDisabled = !scheme.supported;
  const handleClick = useCallback(
    () => onSelect(schemeId),
    [onSelect, schemeId],
  );

  return (
    <UnstyledButton
      onClick={isDisabled ? undefined : handleClick}
      w="100%"
      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
    >
      <Card
        withBorder
        radius="md"
        p="md"
        bg={selected ? "relife.0" : isDisabled ? "gray.0" : undefined}
        style={{
          borderColor: selected ? "var(--mantine-color-relife-7)" : undefined,
          borderWidth: selected ? 2 : 1,
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
            <Badge size="xs" color="relife" variant="filled">
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
});

// ─────────────────────────────────────────────────────────────────────────────
// Loan summary metrics (derived display)
// ─────────────────────────────────────────────────────────────────────────────

function computeAnnuity(loanAmount: number, ratePct: number, years: number) {
  if (loanAmount <= 0 || years <= 0) return 0;
  const r = ratePct;
  if (r === 0) return loanAmount / years;
  return (loanAmount * r) / (1 - Math.pow(1 + r, -years));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function FinancingStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const services = usePortfolioAdvisorServices();

  const handleSelectScheme = useCallback(
    (scheme: FinancingScheme) => {
      dispatch({ type: "SET_FINANCING_SCHEME", scheme });
    },
    [dispatch],
  );

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const handleAnalyze = async () => {
    dispatch({ type: "START_ANALYSIS" });

    try {
      const results = await services.portfolioAnalysis.analyzePortfolio({
        buildings: state.buildings,
        selectedMeasures: state.renovation.selectedMeasures,
        financingScheme: state.financingScheme,
        funding: state.funding,
        projectLifetime: state.projectLifetime,
        onProgress: (completed, total, current) => {
          dispatch({
            type: "UPDATE_ANALYSIS_PROGRESS",
            completed,
            total,
            currentBuilding: current,
          });
        },
        globalCapex: state.renovation.estimatedCapex,
        globalMaintenanceCost: state.renovation.estimatedMaintenanceCost,
      });

      // Set all building results in a single dispatch
      dispatch({ type: "BATCH_SET_BUILDING_RESULTS", results });

      dispatch({ type: "ANALYSIS_COMPLETE" });
      dispatch({ type: "SET_STEP", step: 3 });
    } catch (e: unknown) {
      dispatch({
        type: "ANALYSIS_ERROR",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Loan summary derived from existing state. Total CAPEX = sum of per-building
  // overrides plus the global default for buildings without an override.
  const totalCapex = useMemo(() => {
    return state.buildings.reduce((sum, b) => {
      if (typeof b.estimatedCapex === "number") return sum + b.estimatedCapex;
      return sum + (state.renovation.estimatedCapex ?? 0);
    }, 0);
  }, [state.buildings, state.renovation.estimatedCapex]);

  const loanAmount =
    state.financingScheme === "debt"
      ? totalCapex * (state.funding.loan.percentage / 100)
      : 0;
  const ownerEquity = totalCapex - loanAmount;
  const annuity = computeAnnuity(
    loanAmount,
    state.funding.loan.interestRate,
    state.funding.loan.duration,
  );

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
              schemeId={scheme.id}
              selected={state.financingScheme === scheme.id}
              onSelect={handleSelectScheme}
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
                description="Share of total CAPEX financed by the loan."
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
                description="Repayment horizon."
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
                description="Effective annual rate."
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

          {/* Loan summary — derived from existing state, no new fields */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mt="lg">
            <MetricCard
              label="Total CAPEX"
              value={formatCurrency(totalCapex)}
            />
            <MetricCard
              label="Loan amount"
              value={formatCurrency(loanAmount)}
              variant="highlight"
            />
            <MetricCard
              label="Owner equity"
              value={formatCurrency(ownerEquity)}
            />
            <MetricCard
              label="Annual payment"
              value={formatCurrency(annuity)}
            />
          </SimpleGrid>
        </Card>
      )}

      {/* Error display */}
      <ErrorAlert error={state.error} title="Analysis Error" />

      {/* Navigation
          Note: a global Progress bar already shows during analysis at the
          top of the wizard, so the local progress card has been removed. */}
      <StepNavigation
        currentStep={2}
        totalSteps={4}
        onPrevious={handlePrevious}
        previousLabel="Back to renovation options"
        onPrimaryAction={handleAnalyze}
        primaryActionLabel="Analyse portfolio"
        isLoading={state.isEvaluating}
        primaryDisabled={state.buildings.length === 0}
        disabled={state.isEvaluating}
      />
    </Stack>
  );
}
