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
import { memo, useMemo, useState, type ReactNode } from "react";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import {
  relifeConcepts,
  type ConceptId,
} from "../../../../constants/relifeConcepts";
import {
  formatCurrency,
  formatDecimal,
  formatPercent,
  formatTonnageCo2,
  formatYears,
  getEnergyReduction,
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

/**
 * The after figure is the one being reported, so it carries the weight; the
 * before figure is context. The unit is written once, at the end of the pair.
 */
function BeforeAfterTonnes({
  before,
  after,
}: {
  before: number;
  after: number;
}) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text span fz="md" fw={500} c="dimmed">
        {formatDecimal(before)}
      </Text>
      <IconArrowRight size={14} color="var(--mantine-color-gray-5)" />
      <Text span fz={20} fw={600}>
        {formatTonnageCo2(after, { decimal: true })}
      </Text>
    </Group>
  );
}

/** Render a value that may be unavailable, so a gap never reads as a zero. */
function orDash<T>(value: T | undefined, render: (value: T) => ReactNode) {
  return value !== undefined ? render(value) : "—";
}

/** A coverage figure shown inline in the summary card header, not as a card. */
function HeaderStat({
  label,
  children,
  color,
}: {
  label: string;
  children: ReactNode;
  color?: string;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text fz="xs" c="dimmed">
        {label}
      </Text>
      <Text
        component="div"
        fz="sm"
        fw={700}
        c={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {children}
      </Text>
    </Group>
  );
}

/** An eyebrow-labelled band of metric cards. */
function MetricGroup({
  label,
  cols,
  children,
}: {
  label: string;
  cols: Record<string, number>;
  children: ReactNode;
}) {
  return (
    <Stack gap="xs">
      <MetricEyebrow>{label}</MetricEyebrow>
      <SimpleGrid cols={cols} spacing="sm">
        {children}
      </SimpleGrid>
    </Stack>
  );
}

const PortfolioSummary = memo(function PortfolioSummary({
  aggregate,
}: {
  aggregate: PortfolioPackageAggregate;
}) {
  const { coverage } = aggregate;
  const thermalReduction = getEnergyReduction(
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
        <Group
          justify="space-between"
          align="baseline"
          gap="lg"
          wrap="wrap"
          pb="md"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
        >
          <Title order={4}>Portfolio summary</Title>
          <Group gap="lg" wrap="wrap" align="baseline">
            <HeaderStat label="Total buildings">
              {coverage.totalBuildings}
            </HeaderStat>
            <HeaderStat label="In these totals" color="green">
              <Group gap={6} wrap="nowrap" align="baseline">
                {coverage.contributing}
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
            </HeaderStat>
          </Group>
        </Group>

        <Stack gap="lg" pt="md">
          <MetricGroup
            label="Financial outcome"
            cols={{ base: 2, sm: 3, md: 5 }}
          >
            <ConceptMetricCard
              conceptId="investment"
              prefix="Total"
              value={formatCurrency(aggregate.totalCapexEur)}
              variant="highlight"
            />
            <ConceptMetricCard
              conceptId="npv"
              prefix="Total"
              value={orDash(aggregate.totalNpvEur, formatCurrency)}
              variant="highlight"
            />
            <ConceptMetricCard
              conceptId="roi"
              prefix="Portfolio"
              value={orDash(aggregate.portfolioRoi, (v) =>
                formatPercent(v * 100),
              )}
            />
            <ConceptMetricCard
              conceptId="payback-period"
              prefix="Portfolio"
              value={orDash(aggregate.portfolioPaybackYears, formatYears)}
            />
            <ConceptMetricCard
              conceptId="annual-maintenance-cost"
              prefix="Total"
              value={orDash(
                aggregate.totalAnnualMaintenanceEur,
                formatCurrency,
              )}
            />
          </MetricGroup>

          <MetricGroup label="Energy & carbon" cols={{ base: 2, md: 4 }}>
            <ConceptMetricCard
              conceptId="annual-building-thermal-needs"
              prefix="Total reduction in"
              value={orDash(thermalReduction, formatPercent)}
            />
            <ConceptMetricCard
              conceptId="operational-co2-emissions"
              prefix="Annual"
              value={
                emissionsBefore !== undefined &&
                emissionsAfter !== undefined ? (
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
              value={orDash(aggregate.totalEmbodiedCarbonTon, (v) =>
                formatTonnageCo2(v, { decimal: true }),
              )}
            />
            <ConceptMetricCard
              conceptId="whole-life-carbon"
              prefix="Total"
              value={orDash(aggregate.totalWholeLifeCarbonTon, (v) =>
                formatTonnageCo2(v, { decimal: true }),
              )}
            />
          </MetricGroup>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder radius="md" p="lg">
          <Stack gap="xs" h="100%">
            <Box>
              <Title order={5}>Energy use</Title>
              <Text size="xs" c="dimmed">
                Total annual building thermal needs.
              </Text>
            </Box>
            {aggregate.totalThermalNeedsBeforeKwh > 0 ? (
              <Box mt="auto">
                <EnergyChart
                  before={aggregate.totalThermalNeedsBeforeKwh}
                  after={aggregate.totalThermalNeedsAfterKwh}
                />
              </Box>
            ) : (
              <Text size="sm" c="dimmed">
                No energy data available.
              </Text>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="xs" h="100%">
            <Box>
              <Title order={5}>System energy consumption</Title>
              <Text size="xs" c="dimmed">
                Total annual delivered energy, which drives the financial
                analysis.
              </Text>
            </Box>
            {deliveredBefore !== undefined && deliveredAfter !== undefined ? (
              <Box mt="auto">
                <EnergyChart before={deliveredBefore} after={deliveredAfter} />
              </Box>
            ) : (
              <Text size="sm" c="dimmed">
                Not available for every building in these totals.
              </Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
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
