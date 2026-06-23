/**
 * ScoreCompositionChart — "why this ranking" stacked horizontal bar chart.
 * Each bar is one package; the stacked segments are the weighted, normalized
 * score components produced by the ranking service, which sum to the
 * package's total score.
 */

import { BarChart } from "@mantine/charts";
import { Accordion, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconChartBar, IconInfoCircle } from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import { formatNumber } from "../../../../utils/formatters";
import { relifeConcepts } from "../../../../constants/relifeConcepts";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSERankingResult } from "../../types";
import {
  RSE_CHART_TOOLTIP_PROPS,
  RSE_CHART_Y_AXIS_PROPS,
  SCORE_COMPONENT_META,
} from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

const SERIES_COLORS = ["relife.6", "blue.6", "teal.6", "orange.6"];

interface ScoreCompositionChartProps {
  rankings: RSERankingResult[];
}

export function ScoreCompositionChart({
  rankings,
}: ScoreCompositionChartProps) {
  if (rankings.length === 0) {
    return null;
  }

  const componentKeys = Object.keys(rankings[0].scoreComponents);
  const data = rankings.map((entry) => ({
    package: RSE_PACKAGES[entry.packageId].label,
    ...Object.fromEntries(
      componentKeys.map((key) => [
        key,
        (entry.scoreComponents[key] ?? 0) * 100,
      ]),
    ),
  }));
  const series = componentKeys.map((key, index) => ({
    name: key,
    label: SCORE_COMPONENT_META[key]?.label ?? key,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }));

  const rankingMethod = relifeConcepts["rse-ranking-method"];

  return (
    <section className={classes.chartCard} aria-label="Score composition">
      <div className={classes.chartCardHead}>
        <IconChartBar size={16} />
        <h3>Why this ranking</h3>
        <ConceptExplainer conceptId="ranking-score" />
      </div>
      <Text size="xs" c="dimmed" mb="md">
        Weighted score contributions (0–100) per package for your selected goal.
        Segments sum to each package's total score.
      </Text>
      <Accordion
        chevronPosition="right"
        variant="default"
        multiple={false}
        mb="md"
      >
        <Accordion.Item value="ranking-method">
          <Accordion.Control
            icon={
              <ThemeIcon color="blue" variant="light" size="sm">
                <IconInfoCircle size={16} />
              </ThemeIcon>
            }
          >
            {rankingMethod.label}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="xs">{rankingMethod.description}</Text>
              {rankingMethod.caveat ? (
                <Text size="xs" c="dimmed">
                  {rankingMethod.caveat}
                </Text>
              ) : null}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <BarChart
        h={rankings.length * 56 + 48}
        data={data}
        dataKey="package"
        orientation="vertical"
        type="stacked"
        series={series}
        withLegend
        tickLine="none"
        gridAxis="x"
        yAxisProps={RSE_CHART_Y_AXIS_PROPS}
        valueFormatter={formatNumber}
        withTooltip
        tooltipProps={RSE_CHART_TOOLTIP_PROPS}
      />
    </section>
  );
}
