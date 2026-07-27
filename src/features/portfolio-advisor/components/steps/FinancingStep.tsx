/**
 * FinancingStep Component
 * Step 2: Financing configuration and portfolio analysis trigger.
 */

import { Box, Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { EnergyTariffPanel } from "../../../../components/shared/EnergyTariffPanel";
import { MetricCard } from "../../../../components/shared/MetricCard";
import {
  FinancingTypeCards,
  SubsidyInput,
} from "../../../../components/shared";
import { formatCurrency } from "../../../../utils/formatters";
import { applyFundingReduction } from "../../../../utils/financialCalculations";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";

export function FinancingStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const services = usePortfolioAdvisorServices();

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const handleAnalyze = async () => {
    dispatch({ type: "START_ANALYSIS" });

    try {
      const results = await services.portfolioAnalysis.analyzePortfolio({
        buildings: state.buildings,
        selectedMeasures: state.renovation.selectedMeasures,
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
        financialAssumptions: {
          gasTariffEurPerKwh: state.gasTariffEurPerKwh,
        },
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

  // Funding summary derived from existing state. Totals sum the buildings whose
  // cost is known up front (per-building override or global override); buildings
  // with neither are auto-estimated during analysis, so they are not counted
  // here — `hasAutoEstimated` flags that the figures are partial.
  //
  // The split runs through the same `applyFundingReduction` the analysis uses,
  // per building, so this preview cannot drift from what is actually sent.
  const { totalCapex, totalSubsidy, totalLoan, totalEquity, hasAutoEstimated } =
    useMemo(() => {
      let capexTotal = 0;
      let subsidyTotal = 0;
      let loanTotal = 0;
      let equityTotal = 0;
      let autoEstimated = false;

      for (const b of state.buildings) {
        const capex =
          typeof b.estimatedCapex === "number"
            ? b.estimatedCapex
            : state.renovation.estimatedCapex;
        if (capex == null) {
          autoEstimated = true;
          continue;
        }
        const { effectiveCost, loanAmount, subsidyAmount } =
          applyFundingReduction(capex, state.funding);
        capexTotal += capex;
        subsidyTotal += subsidyAmount;
        loanTotal += loanAmount;
        equityTotal += effectiveCost - loanAmount;
      }

      return {
        totalCapex: capexTotal,
        totalSubsidy: subsidyTotal,
        totalLoan: loanTotal,
        totalEquity: equityTotal,
        hasAutoEstimated: autoEstimated,
      };
    }, [state.buildings, state.renovation.estimatedCapex, state.funding]);

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Financing Configuration
        </Title>
        <Text c="dimmed" size="sm">
          Choose how the renovation is paid for and add any subsidy that lowers
          the cost first.
        </Text>
      </Box>

      <Card withBorder radius="md" p="lg">
        <Stack gap="lg">
          <FinancingTypeCards
            value={state.funding.financingType}
            onChange={(financingType) =>
              dispatch({ type: "SET_FINANCING_TYPE", financingType })
            }
            loan={state.funding.loan}
            onLoanChange={(loan) => dispatch({ type: "SET_LOAN", loan })}
            loanPercentageLabel="Loan percentage"
            loanPercentageDescription="Share of the post-subsidy CAPEX financed by the loan."
          />

          <SubsidyInput
            incentives={state.funding.incentives}
            onChange={(incentives) =>
              dispatch({ type: "SET_INCENTIVES", incentives })
            }
            amountHelperText="Applied to each building in the portfolio."
          />

          {/* Funding summary — derived from existing state, no new fields */}
          <div>
            <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
              <MetricCard
                label="Total CAPEX"
                value={formatCurrency(totalCapex)}
              />
              <MetricCard
                label="Subsidy"
                value={formatCurrency(totalSubsidy)}
              />
              <MetricCard
                label="Loan amount"
                value={formatCurrency(totalLoan)}
                variant="highlight"
              />
              <MetricCard
                label="Owner equity"
                value={formatCurrency(totalEquity)}
              />
            </SimpleGrid>
            {hasAutoEstimated && (
              <Text size="xs" c="dimmed" mt="xs">
                Figures cover only buildings with a set CAPEX. Buildings without
                a cost override are auto-estimated from EU reference data during
                analysis and are not included here.
              </Text>
            )}
          </div>
        </Stack>
      </Card>

      <EnergyTariffPanel
        appliedGasTariff={state.gasTariffEurPerKwh}
        onApplyGasTariff={(gasTariffEurPerKwh) =>
          dispatch({ type: "SET_GAS_TARIFF", gasTariffEurPerKwh })
        }
        isApplying={state.isEvaluating}
      />

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
