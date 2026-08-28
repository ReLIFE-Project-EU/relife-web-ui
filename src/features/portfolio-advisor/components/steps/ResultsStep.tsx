/**
 * ResultsStep Component
 * Step 3: Portfolio analysis results display, organized in two tabs:
 *   1. Portfolio summary — portfolio totals + EPC distribution + energy charts
 *   2. Per building     — sortable / filterable results table with row drill-down
 *   Methodology / data transparency is shown inline under Portfolio summary
 */

import {
  Accordion,
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
  IconArrowRight,
  IconBuilding,
  IconChartBar,
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
  formatTonnageCo2,
  formatYears,
} from "../../../../utils/formatters";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { PRA_PACKAGE_ID } from "../../constants";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import {
  BuildingResultsTable,
  type RowVm,
} from "../results/BuildingResultsTable";
import { BuildingDrillDownModal } from "../results/BuildingDrillDownModal";
import { EnergyChart } from "../results/EnergyChart";
import { EPCDistribution } from "../results/EPCDistribution";
import {
  aggregatePortfolioPackage,
  type PortfolioPackageAggregate,
} from "../../services/portfolioAggregation";
import { ResultsExportMenu } from "../results/ResultsExportMenu";

function ConceptSentence(conceptId: ConceptId) {
  const concept = relifeConcepts[conceptId];
  return `${concept.description}${concept.caveat ? ` ${concept.caveat}` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio summary tab content
// ─────────────────────────────────────────────────────────────────────────────

/** Percent change between two portfolio totals, or undefined when there is no base. */
function totalsReduction(before: number, after: number): number | undefined {
  return before > 0 ? calculatePercentChange(before, after) : undefined;
}

function BeforeAfterTonnes({
  before,
  after,
}: {
  before: number;
  after: number;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text span size="lg" fw={600}>
        {formatTonnageCo2(before, { decimal: true })}
      </Text>
      <IconArrowRight size={14} color="var(--mantine-color-gray-5)" />
      <Text span size="lg" fw={600}>
        {formatTonnageCo2(after, { decimal: true })}
      </Text>
    </Group>
  );
}

const PortfolioSummary = memo(function PortfolioSummary({
  aggregate,
}: {
  aggregate: PortfolioPackageAggregate;
}) {
  const { coverage } = aggregate;
  const thermalReduction = totalsReduction(
    aggregate.totalThermalNeedsBeforeKwh,
    aggregate.totalThermalNeedsAfterKwh,
  );
  const {
    totalDeliveredBeforeKwh: deliveredBefore,
    totalDeliveredAfterKwh: deliveredAfter,
    totalAnnualEmissionsBeforeTon: emissionsBefore,
    totalAnnualEmissionsAfterTon: emissionsAfter,
  } = aggregate;

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Portfolio summary
        </Title>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
          <MetricCard label="Total Buildings" value={coverage.totalBuildings} />
          <MetricCard
            label="In These Totals"
            value={
              <Group gap={4}>
                <Text size="lg" fw={600} c="green">
                  {coverage.contributing}
                </Text>
                {coverage.errored > 0 && (
                  <Badge color="red" size="sm" variant="light">
                    {coverage.errored} errors
                  </Badge>
                )}
                {coverage.rejected > 0 && (
                  <Badge color="orange" size="sm" variant="light">
                    {coverage.rejected} rejected
                  </Badge>
                )}
                {coverage.withoutPackage > 0 && (
                  <Badge color="gray" size="sm" variant="light">
                    {coverage.withoutPackage} not costed
                  </Badge>
                )}
              </Group>
            }
          />
          <ConceptMetricCard
            conceptId="investment"
            prefix="Total"
            value={formatCurrency(aggregate.totalCapexEur)}
            variant="highlight"
          />
          <ConceptMetricCard
            conceptId="npv"
            prefix="Total"
            value={
              aggregate.totalNpvEur !== undefined
                ? formatCurrency(aggregate.totalNpvEur)
                : "—"
            }
            variant="highlight"
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
          <ConceptMetricCard
            conceptId="roi"
            prefix="Portfolio"
            value={
              aggregate.portfolioRoi !== undefined
                ? `${formatDecimal(aggregate.portfolioRoi * 100)}%`
                : "—"
            }
          />
          <ConceptMetricCard
            conceptId="payback-period"
            prefix="Portfolio"
            value={
              aggregate.portfolioPaybackYears !== undefined
                ? formatYears(aggregate.portfolioPaybackYears)
                : "—"
            }
          />
          <ConceptMetricCard
            conceptId="annual-building-thermal-needs"
            prefix="Total reduction in"
            value={
              thermalReduction !== undefined
                ? `${formatDecimal(thermalReduction)}%`
                : "—"
            }
          />
          <ConceptMetricCard
            conceptId="annual-maintenance-cost"
            prefix="Total"
            value={
              aggregate.totalAnnualMaintenanceEur !== undefined
                ? formatCurrency(aggregate.totalAnnualMaintenanceEur)
                : "—"
            }
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <ConceptMetricCard
            conceptId="operational-co2-emissions"
            value={
              emissionsBefore !== undefined && emissionsAfter !== undefined ? (
                <BeforeAfterTonnes
                  before={emissionsBefore}
                  after={emissionsAfter}
                />
              ) : (
                "—"
              )
            }
          />
          <ConceptMetricCard
            conceptId="embodied-carbon"
            prefix="Total"
            value={
              aggregate.totalEmbodiedCarbonTon !== undefined
                ? formatTonnageCo2(aggregate.totalEmbodiedCarbonTon, {
                    decimal: true,
                  })
                : "—"
            }
          />
          <ConceptMetricCard
            conceptId="whole-life-carbon"
            prefix="Total"
            value={
              aggregate.totalWholeLifeCarbonTon !== undefined
                ? formatTonnageCo2(aggregate.totalWholeLifeCarbonTon, {
                    decimal: true,
                  })
                : "—"
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
            {aggregate.totalThermalNeedsBeforeKwh > 0 ? (
              <EnergyChart
                before={aggregate.totalThermalNeedsBeforeKwh}
                after={aggregate.totalThermalNeedsAfterKwh}
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
              <Title order={5}>System energy consumption</Title>
              <Text size="xs" c="dimmed">
                Total annual delivered energy, which drives the financial
                analysis.
              </Text>
            </Box>
            {deliveredBefore !== undefined && deliveredAfter !== undefined ? (
              <EnergyChart before={deliveredBefore} after={deliveredAfter} />
            ) : (
              <Text size="sm" c="dimmed">
                Not available for every building in these totals.
              </Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="lg">
        <Stack gap="xs">
          <Box>
            <Title order={5}>EPC distribution</Title>
            <Text size="xs" c="dimmed">
              Buildings per class before and after renovation.
            </Text>
          </Box>
          <EPCDistribution
            before={aggregate.epcCountsBefore}
            after={aggregate.epcCountsAfter}
          />
        </Stack>
      </Card>
    </Stack>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Data transparency content (shown inline under Portfolio summary)
// ─────────────────────────────────────────────────────────────────────────────

function DataTransparencyContent() {
  return (
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
          — Calculated from annual building thermal needs as (after − before) /
          before. Negative values indicate lower modeled heating and cooling
          needs.
        </Text>
      </List.Item>
      <List.Item>
        <Text size="xs" c="dimmed">
          <Text span size="xs" fw={500} c="dimmed">
            System energy consumption
          </Text>{" "}
          — {ConceptSentence("system-energy-consumption")} Financial savings are
          based on reductions in this value when available.
        </Text>
      </List.Item>
      <List.Item>
        <Text size="xs" c="dimmed">
          <Text span size="xs" fw={500} c="dimmed">
            Financial indicators
          </Text>{" "}
          (NPV, ROI, payback period) — Computed by the Financial Service; risk
          ranges use Monte Carlo simulation when available.
        </Text>
      </List.Item>
      <List.Item>
        <Text size="xs" c="dimmed">
          <Text span size="xs" fw={500} c="dimmed">
            Portfolio totals
          </Text>{" "}
          — Money is summed across buildings, portfolio ROI is total profit over
          total investment, and payback comes from the summed yearly cash flows.
          These are not averages of per-building figures, which would weight
          buildings equally regardless of size. A total that some building
          cannot supply is shown as unavailable rather than as a smaller number.
        </Text>
      </List.Item>
      <List.Item>
        <Text size="xs" c="dimmed">
          <Text span size="xs" fw={500} c="dimmed">
            IRR, discounted payback and risk ranges
          </Text>{" "}
          — Reported per building; open a row in the per-building tab. They come
          from a Monte Carlo simulation whose distributions cannot be pooled
          across buildings, so no portfolio-wide equivalent is shown.
        </Text>
      </List.Item>
    </List>
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

  const aggregate = useMemo(
    () =>
      aggregatePortfolioPackage({
        packageId: PRA_PACKAGE_ID,
        results: Object.values(state.buildingResults),
        totalBuildings: state.buildings.length,
        projectLifetimeYears: state.projectLifetime,
      }),
    [state.buildingResults, state.buildings.length, state.projectLifetime],
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

      <Group justify="flex-end">
        <ResultsExportMenu
          buildings={state.buildings}
          results={state.buildingResults}
          aggregate={aggregate}
          projectLifetime={state.projectLifetime}
        />
      </Group>

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
        </Tabs.List>

        <Tabs.Panel value="portfolio" pt="lg">
          <Stack gap="lg">
            <PortfolioSummary aggregate={aggregate} />
            <Accordion
              chevronPosition="right"
              variant="default"
              multiple={false}
            >
              <Accordion.Item value="data-transparency">
                <Accordion.Control
                  icon={
                    <ThemeIcon color="gray" variant="light" size="sm">
                      <IconShieldCheck size={16} />
                    </ThemeIcon>
                  }
                >
                  Methodology & data transparency
                </Accordion.Control>
                <Accordion.Panel>
                  <DataTransparencyContent />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="buildings" pt="lg">
          <BuildingResultsTable
            buildings={state.buildings}
            results={state.buildingResults}
            onRowClick={setDrillRow}
          />
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
