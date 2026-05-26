/**
 * ResultsStep Component
 * Step 3: Portfolio analysis results display, organized in three tabs:
 *   1. Portfolio summary — aggregate metrics + EPC distribution + energy charts
 *   2. Per building     — sortable / filterable results table with row drill-down
 *   3. Report           — methodology and data-transparency disclosure
 */

import {
  Badge,
  Box,
  Card,
  Group,
  List,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBuilding,
  IconChartBar,
  IconFileText,
  IconInfoCircle,
  IconShieldCheck,
} from "@tabler/icons-react";
import { memo, useMemo, useState } from "react";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import {
  relifeConcepts,
  type ConceptId,
} from "../../../../constants/relifeConcepts";
import {
  calculatePercentChange,
  formatCurrency,
  formatDecimal,
} from "../../../../utils/formatters";
import { getEPCImprovement } from "../../../../utils/epcUtils";
import { ENERGY_PRICE_EUR_PER_KWH } from "../../../../services/energyUtils";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { BuildingAnalysisResult } from "../../context/types";
import {
  BuildingResultsTable,
  type RowVm,
} from "../results/BuildingResultsTable";
import { BuildingDrillDownModal } from "../results/BuildingDrillDownModal";
import { EnergyChart } from "../results/EnergyChart";

function ConceptSentence(conceptId: ConceptId) {
  const concept = relifeConcepts[conceptId];
  return `${concept.description}${concept.caveat ? ` ${concept.caveat}` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregations
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioStats {
  totalBuildings: number;
  successCount: number;
  errorCount: number;
  rejectedCount: number;
  totalCapex: number;
  avgNPV: number;
  avgROI: number;
  avgPBP: number;
  avgEnergyReduction: number | null;
  avgEPCImprovement: number | null;
  totalEnergyBefore: number;
  totalEnergyAfter: number;
}

function computeStats(
  results: Record<string, BuildingAnalysisResult>,
  totalBuildings: number,
): PortfolioStats {
  const entries = Object.values(results);
  const successful = entries.filter((r) => r.status === "success");
  const errors = entries.filter((r) => r.status === "error");
  const rejected = entries.filter((r) => r.status === "rejected");

  let totalCapex = 0;
  let totalNPV = 0;
  let totalROI = 0;
  let totalPBP = 0;
  let validFinancialCount = 0;
  let totalEnergyReduction = 0;
  let validEnergyCount = 0;
  let totalEPCImprovement = 0;
  let validEPCCount = 0;
  let totalEnergyBefore = 0;
  let totalEnergyAfter = 0;

  for (const result of successful) {
    const fr = result.financialResults;
    if (fr) {
      totalCapex += fr.capitalExpenditure;
      totalNPV += fr.netPresentValue;
      totalROI += fr.returnOnInvestment;
      totalPBP += fr.paybackTime;
      validFinancialCount++;
    }

    const energyBefore = result.estimation?.annualEnergyNeeds;
    const renovated = result.scenarios?.find((s) => s.id === "renovated");
    const energyAfter = renovated?.annualEnergyNeeds;
    if (
      energyBefore !== undefined &&
      energyAfter !== undefined &&
      energyBefore > 0
    ) {
      totalEnergyReduction += calculatePercentChange(energyBefore, energyAfter);
      validEnergyCount++;
      totalEnergyBefore += energyBefore;
      totalEnergyAfter += energyAfter;
    }

    const epcBefore = result.estimation?.estimatedEPC;
    const epcAfter = renovated?.epcClass;
    if (epcBefore && epcAfter) {
      totalEPCImprovement += getEPCImprovement(epcBefore, epcAfter);
      validEPCCount++;
    }
  }

  return {
    totalBuildings,
    successCount: successful.length,
    errorCount: errors.length,
    rejectedCount: rejected.length,
    totalCapex,
    avgNPV: validFinancialCount > 0 ? totalNPV / validFinancialCount : 0,
    avgROI: validFinancialCount > 0 ? totalROI / validFinancialCount : 0,
    avgPBP: validFinancialCount > 0 ? totalPBP / validFinancialCount : 0,
    avgEnergyReduction:
      validEnergyCount > 0 ? totalEnergyReduction / validEnergyCount : null,
    avgEPCImprovement:
      validEPCCount > 0 ? totalEPCImprovement / validEPCCount : null,
    totalEnergyBefore,
    totalEnergyAfter,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio summary tab content
// ─────────────────────────────────────────────────────────────────────────────

const PortfolioSummary = memo(function PortfolioSummary({
  stats,
}: {
  stats: PortfolioStats;
}) {
  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Portfolio summary
        </Title>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
          <MetricCard label="Total Buildings" value={stats.totalBuildings} />
          <MetricCard
            label="Successfully Analyzed"
            value={
              <Group gap={4}>
                <Text size="lg" fw={600} c="green">
                  {stats.successCount}
                </Text>
                {stats.errorCount > 0 && (
                  <Badge color="red" size="sm" variant="light">
                    {stats.errorCount} errors
                  </Badge>
                )}
                {stats.rejectedCount > 0 && (
                  <Badge color="orange" size="sm" variant="light">
                    {stats.rejectedCount} rejected
                  </Badge>
                )}
              </Group>
            }
          />
          <ConceptMetricCard
            conceptId="investment"
            prefix="Total"
            value={formatCurrency(stats.totalCapex)}
            variant="highlight"
          />
          <ConceptMetricCard
            conceptId="npv"
            prefix="Avg."
            value={formatCurrency(stats.avgNPV)}
            variant="highlight"
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <ConceptMetricCard
            conceptId="roi"
            prefix="Avg."
            value={`${formatDecimal(stats.avgROI * 100)}%`}
          />
          <ConceptMetricCard
            conceptId="payback-period"
            prefix="Avg."
            value={`${formatDecimal(stats.avgPBP)} years`}
          />
          <ConceptMetricCard
            conceptId="annual-building-thermal-needs"
            prefix="Avg. reduction in"
            value={
              stats.avgEnergyReduction !== null
                ? `${formatDecimal(stats.avgEnergyReduction)}%`
                : "-"
            }
          />
          <ConceptMetricCard
            conceptId="estimated-epc"
            prefix="Avg. improvement in"
            value={
              stats.avgEPCImprovement !== null
                ? `${stats.avgEPCImprovement > 0 ? "+" : ""}${formatDecimal(stats.avgEPCImprovement)} classes`
                : "-"
            }
          />
        </SimpleGrid>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder radius="md" p="lg">
          <Stack gap="xs">
            <Box>
              <Title order={5}>Energy use</Title>
              <Text size="xs" c="dimmed">
                Total annual building thermal needs.
              </Text>
            </Box>
            {stats.totalEnergyBefore > 0 ? (
              <EnergyChart
                before={stats.totalEnergyBefore}
                after={stats.totalEnergyAfter}
              />
            ) : (
              <Text size="sm" c="dimmed">
                No energy data available.
              </Text>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="xs">
            <Box>
              <Title order={5}>Annual energy bill</Title>
              <Text size="xs" c="dimmed">
                Estimated yearly cost at a flat tariff of EUR{" "}
                {ENERGY_PRICE_EUR_PER_KWH}/kWh.
              </Text>
            </Box>
            {stats.totalEnergyBefore > 0 ? (
              <EnergyChart
                before={stats.totalEnergyBefore * ENERGY_PRICE_EUR_PER_KWH}
                after={stats.totalEnergyAfter * ENERGY_PRICE_EUR_PER_KWH}
                formatValue={(v) => formatCurrency(v)}
              />
            ) : (
              <Text size="sm" c="dimmed">
                No energy data available.
              </Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Report tab content
// ─────────────────────────────────────────────────────────────────────────────

function ReportTab() {
  return (
    <Card withBorder radius="md" p="lg">
      <Group gap="xs" mb="sm">
        <ThemeIcon color="gray" variant="light" size="sm">
          <IconShieldCheck size={16} />
        </ThemeIcon>
        <Title order={4}>Data transparency</Title>
      </Group>
      <List
        size="xs"
        spacing={6}
        icon={
          <ThemeIcon color="gray" variant="transparent" size="sm">
            <IconInfoCircle size={14} />
          </ThemeIcon>
        }
      >
        <List.Item>
          <Text size="xs" c="dimmed">
            <Text span size="xs" fw={500} c="dimmed">
              EPC classes
            </Text>{" "}
            — {ConceptSentence("estimated-epc")}
          </Text>
        </List.Item>
        <List.Item>
          <Text size="xs" c="dimmed">
            <Text span size="xs" fw={500} c="dimmed">
              Energy reduction
            </Text>{" "}
            — Calculated from annual building thermal needs as (after − before)
            / before. Negative values indicate lower modeled heating and cooling
            needs.
          </Text>
        </List.Item>
        <List.Item>
          <Text size="xs" c="dimmed">
            <Text span size="xs" fw={500} c="dimmed">
              System energy consumption
            </Text>{" "}
            — {ConceptSentence("system-energy-consumption")} Financial savings
            are based on reductions in this value when available.
          </Text>
        </List.Item>
        <List.Item>
          <Text size="xs" c="dimmed">
            <Text span size="xs" fw={500} c="dimmed">
              Energy costs
            </Text>{" "}
            — Use a flat tariff of EUR {ENERGY_PRICE_EUR_PER_KWH}/kWh (platform
            assumption, not country-specific).
          </Text>
        </List.Item>
        <List.Item>
          <Text size="xs" c="dimmed">
            <Text span size="xs" fw={500} c="dimmed">
              Financial indicators
            </Text>{" "}
            (NPV, ROI, payback period) — Computed by the Financial Service using
            Monte Carlo simulation.
          </Text>
        </List.Item>
      </List>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ResultsStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const [activeTab, setActiveTab] = useState<string>("portfolio");
  const [drillRow, setDrillRow] = useState<RowVm | null>(null);

  const hasResults = Object.keys(state.buildingResults).length > 0;

  const stats = useMemo(
    () => computeStats(state.buildingResults, state.buildings.length),
    [state.buildingResults, state.buildings.length],
  );

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 2 });
  };

  if (!hasResults) {
    return (
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="xs">
            Analysis Results
          </Title>
          <Text c="dimmed">
            No results available. Please run the portfolio analysis first.
          </Text>
        </Box>
        <StepNavigation
          currentStep={3}
          totalSteps={4}
          onPrevious={handlePrevious}
          previousLabel="Back to financing"
        />
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Portfolio Analysis Results
        </Title>
        <Text c="dimmed" size="sm">
          Estimated portfolio impact, per-building results, and a methodology
          summary. Thermal-needs reduction remains separate from system-energy
          savings, which drive the financial analysis when available.
        </Text>
      </Box>

      <ErrorAlert error={state.error} title="Analysis Error" />

      <Tabs
        value={activeTab}
        onChange={(v) => setActiveTab(v ?? "portfolio")}
        keepMounted={false}
      >
        <Tabs.List>
          <Tabs.Tab value="portfolio" leftSection={<IconChartBar size={16} />}>
            Portfolio summary
          </Tabs.Tab>
          <Tabs.Tab
            value="buildings"
            leftSection={<IconBuilding size={16} />}
            rightSection={
              <Badge variant="light" color="gray" size="xs">
                {Object.keys(state.buildingResults).length}
              </Badge>
            }
          >
            Per building
          </Tabs.Tab>
          <Tabs.Tab value="report" leftSection={<IconFileText size={16} />}>
            Report
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="portfolio" pt="lg">
          <PortfolioSummary stats={stats} />
        </Tabs.Panel>

        <Tabs.Panel value="buildings" pt="lg">
          <BuildingResultsTable
            buildings={state.buildings}
            results={state.buildingResults}
            onRowClick={setDrillRow}
          />
        </Tabs.Panel>

        <Tabs.Panel value="report" pt="lg">
          <ReportTab />
        </Tabs.Panel>
      </Tabs>

      <BuildingDrillDownModal
        opened={drillRow !== null}
        onClose={() => setDrillRow(null)}
        building={drillRow?.building}
        result={drillRow?.result}
        projectLifetime={state.projectLifetime}
      />

      {/* Navigation */}
      <StepNavigation
        currentStep={3}
        totalSteps={4}
        onPrevious={handlePrevious}
        previousLabel="Back to financing"
      />
    </Stack>
  );
}
