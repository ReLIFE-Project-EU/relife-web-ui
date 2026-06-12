/**
 * ComparisonCharts — side-by-side package comparison charts.
 * Left: investment (post-incentive) vs aggregate NPV, both in euros.
 * Right: the goal's primary impact metric. Units are never mixed on one axis.
 */

import { BarChart } from "@mantine/charts";
import { SimpleGrid, Text } from "@mantine/core";
import { IconCash, IconChartBar } from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import type { ConceptId } from "../../../../constants/relifeConcepts";
import {
  formatCurrency,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type {
  RSEPackageAggregate,
  RSERankingResult,
  RSERenovationGoal,
} from "../../types";
import {
  RSE_CHART_TOOLTIP_PROPS,
  RSE_CHART_Y_AXIS_PROPS,
} from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

interface ComparisonChartsProps {
  rankings: RSERankingResult[];
  aggregates: RSEPackageAggregate[];
  goal: RSERenovationGoal;
}

const IMPACT_CHART_CONFIG: Record<
  RSERenovationGoal["kind"],
  {
    title: string;
    conceptId: ConceptId;
    getValue: (agg: RSEPackageAggregate) => number | undefined;
    formatter: (value: number) => string;
  }
> = {
  energy: {
    title: "Annual energy savings",
    conceptId: "rse-total-energy-savings",
    getValue: (agg) => agg.totalAnnualEnergySavingsKwh,
    formatter: formatEnergy,
  },
  emission: {
    title: "Annual CO₂ reduction",
    conceptId: "rse-total-co2-reduction",
    getValue: (agg) => agg.totalAnnualCo2ReductionTon,
    formatter: formatTonnageCo2,
  },
  financial: {
    title: "Buildings within budget",
    conceptId: "rse-renovatable-buildings",
    getValue: (agg) => agg.renovatableBuildingsWithinBudget,
    formatter: formatNumber,
  },
};

export function ComparisonCharts({
  rankings,
  aggregates,
  goal,
}: ComparisonChartsProps) {
  const aggregateByPackage = new Map(
    aggregates.map((agg) => [agg.packageId, agg]),
  );
  const orderedAggregates = rankings
    .map((entry) => aggregateByPackage.get(entry.packageId))
    .filter((agg): agg is RSEPackageAggregate => agg !== undefined);

  if (orderedAggregates.length === 0) {
    return null;
  }

  const hasNpv = orderedAggregates.some(
    (agg) => agg.financialIndicators.aggregateNPV !== undefined,
  );
  const chartHeight = orderedAggregates.length * 56 + 48;

  const euroData = orderedAggregates.map((agg) => ({
    package: RSE_PACKAGES[agg.packageId].label,
    investment: agg.totalEffectiveCapexEur,
    ...(agg.financialIndicators.aggregateNPV !== undefined
      ? { npv: agg.financialIndicators.aggregateNPV }
      : {}),
  }));

  const impactConfig = IMPACT_CHART_CONFIG[goal.kind];
  const impactData = orderedAggregates.map((agg) => ({
    package: RSE_PACKAGES[agg.packageId].label,
    value: impactConfig.getValue(agg) ?? 0,
  }));

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <section
        className={classes.chartCard}
        aria-label="Investment and net present value"
      >
        <div className={classes.chartCardHead}>
          <IconCash size={16} />
          <h3>Investment{hasNpv ? " vs aggregate NPV" : ""}</h3>
          <ConceptExplainer conceptId={hasNpv ? "npv" : "investment"} />
        </div>
        <Text size="xs" c="dimmed" mb="md">
          Post-incentive investment
          {hasNpv ? " and modeled net present value" : ""} per package, in
          euros.
        </Text>
        <BarChart
          h={chartHeight}
          data={euroData}
          dataKey="package"
          orientation="vertical"
          series={[
            { name: "investment", label: "Investment", color: "gray.6" },
            ...(hasNpv
              ? [{ name: "npv", label: "Aggregate NPV", color: "relife.6" }]
              : []),
          ]}
          withLegend
          tickLine="none"
          gridAxis="x"
          yAxisProps={RSE_CHART_Y_AXIS_PROPS}
          valueFormatter={formatCurrency}
          withTooltip
          tooltipProps={RSE_CHART_TOOLTIP_PROPS}
        />
      </section>

      <section className={classes.chartCard} aria-label={impactConfig.title}>
        <div className={classes.chartCardHead}>
          <IconChartBar size={16} />
          <h3>{impactConfig.title}</h3>
          <ConceptExplainer conceptId={impactConfig.conceptId} />
        </div>
        <Text size="xs" c="dimmed" mb="md">
          The primary impact metric for your selected goal, per package.
        </Text>
        <BarChart
          h={chartHeight}
          data={impactData}
          dataKey="package"
          orientation="vertical"
          series={[
            { name: "value", label: impactConfig.title, color: "blue.6" },
          ]}
          tickLine="none"
          gridAxis="x"
          yAxisProps={RSE_CHART_Y_AXIS_PROPS}
          valueFormatter={impactConfig.formatter}
          withTooltip
          tooltipProps={RSE_CHART_TOOLTIP_PROPS}
        />
      </section>
    </SimpleGrid>
  );
}
