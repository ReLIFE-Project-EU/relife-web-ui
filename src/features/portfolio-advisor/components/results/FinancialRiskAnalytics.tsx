import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Group,
  Progress,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { IconChartHistogram, IconInfoCircle } from "@tabler/icons-react";
import {
  ConceptExplainer,
  ConceptLabel,
  MetricEyebrow,
  RangeIndicator,
} from "../../../../components/shared";
import {
  financialMetricConceptIds,
  relifeConcepts,
} from "../../../../constants/relifeConcepts";
import {
  formatCurrency,
  formatDecimal,
  formatPercent,
  formatYears,
} from "../../../../utils/formatters";
import type {
  FinancialChartMetadata,
  FinancialRiskIndicator,
  PercentileData,
} from "../../../../types/renovation";
import type { PRAFinancialResults } from "../../context/types";

interface FinancialRiskAnalyticsProps {
  financialResults?: PRAFinancialResults;
}

type MetricFormatter = (value: number) => string;

interface IndicatorConfig {
  indicator: FinancialRiskIndicator;
  conceptId: (typeof financialMetricConceptIds)[FinancialRiskIndicator];
  color: MantineColor;
  lowerIsBetter?: boolean;
  formatter: MetricFormatter;
}

const RISK_CHART_HEIGHT = 260;
/** Narrow enough to keep the probability bars beside the histogram, not under it. */
const PROBABILITY_COLUMN_WIDTH = 300;
/** Indicator · range bar · P10 · P90. */
const RISK_ROW_GRID = {
  display: "grid",
  gridTemplateColumns: "210px 1fr 96px 96px",
  gap: "var(--mantine-spacing-sm)",
} as const;
const PROBABILITY_PERCENT_FACTOR = 100;
const PROBABILITY_BAR_MAX = 100;
const HISTOGRAM_SERIES = [
  { name: "frequency", label: "Frequency", color: "relife.6" },
];

const INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    indicator: "NPV",
    conceptId: financialMetricConceptIds.NPV,
    color: "relife",
    formatter: formatCurrency,
  },
  {
    indicator: "IRR",
    conceptId: financialMetricConceptIds.IRR,
    color: "teal",
    formatter: (value) => formatPercent(value * PROBABILITY_PERCENT_FACTOR),
  },
  {
    indicator: "ROI",
    conceptId: financialMetricConceptIds.ROI,
    color: "green",
    formatter: (value) => formatPercent(value * PROBABILITY_PERCENT_FACTOR),
  },
  {
    indicator: "PBP",
    conceptId: financialMetricConceptIds.PBP,
    color: "orange",
    lowerIsBetter: true,
    formatter: formatYears,
  },
  {
    indicator: "DPP",
    conceptId: financialMetricConceptIds.DPP,
    color: "yellow",
    lowerIsBetter: true,
    formatter: formatYears,
  },
];

export function FinancialRiskAnalytics({
  financialResults,
}: FinancialRiskAnalyticsProps) {
  const riskAssessment = financialResults?.riskAssessment;
  const probabilities =
    financialResults?.probabilities ?? riskAssessment?.probabilities;
  const chartMetadata =
    financialResults?.chartMetadata ?? riskAssessment?.metadata.chart_metadata;
  const percentiles = riskAssessment?.percentiles;

  const availableIndicators = useMemo(
    () =>
      INDICATOR_CONFIGS.filter(
        ({ indicator }) =>
          hasPercentileData(percentiles?.[indicator]) ||
          chartMetadata?.[indicator],
      ),
    [chartMetadata, percentiles],
  );

  const histogramIndicators = useMemo(
    () =>
      INDICATOR_CONFIGS.filter(
        ({ indicator }) => chartMetadata?.[indicator]?.bins,
      ),
    [chartMetadata],
  );

  const [selectedIndicator, setSelectedIndicator] =
    useState<FinancialRiskIndicator | null>(null);

  const activeHistogramIndicator =
    selectedIndicator &&
    histogramIndicators.some(({ indicator }) => indicator === selectedIndicator)
      ? selectedIndicator
      : histogramIndicators[0]?.indicator;

  if (!riskAssessment) {
    return (
      <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
        Professional risk analytics are not available for this building.
      </Alert>
    );
  }

  if (availableIndicators.length === 0 && !hasProbabilities(probabilities)) {
    return (
      <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
        The financial service did not return professional risk distributions for
        this building.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <MetricEyebrow>Professional risk analytics</MetricEyebrow>
        <Text size="xs" c="dimmed">
          Monte Carlo ranges and probability outputs from the financial risk
          assessment.
        </Text>
      </Stack>

      {availableIndicators.length > 0 ? (
        <RiskRangeTable
          configs={availableIndicators}
          percentiles={percentiles}
          chartMetadata={chartMetadata}
          financialResults={financialResults}
        />
      ) : null}

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: PROBABILITY_COLUMN_WIDTH + "px 1fr",
          gap: "var(--mantine-spacing-lg)",
          alignItems: "start",
        }}
      >
        {hasProbabilities(probabilities) ? (
          <Stack gap="sm">
            <MetricEyebrow>Probability thresholds</MetricEyebrow>
            {Object.entries(probabilities)
              .filter(([, value]) => Number.isFinite(value))
              .map(([label, value]) => (
                <ProbabilityRow key={label} label={label} value={value} />
              ))}
          </Stack>
        ) : (
          <Box />
        )}

        {activeHistogramIndicator ? (
          <HistogramPanel
            config={
              INDICATOR_CONFIGS.find(
                ({ indicator }) => indicator === activeHistogramIndicator,
              )!
            }
            chartMetadata={chartMetadata?.[activeHistogramIndicator]}
            histogramIndicators={histogramIndicators}
            activeHistogramIndicator={activeHistogramIndicator}
            onSelectIndicator={setSelectedIndicator}
          />
        ) : null}
      </Box>
    </Stack>
  );
}

/**
 * One row per indicator instead of one card each, so the values and their
 * P10/P90 bounds line up vertically rather than drifting across ten
 * independently sized cards.
 */
function RiskRangeTable({
  configs,
  percentiles,
  chartMetadata,
  financialResults,
}: {
  configs: IndicatorConfig[];
  percentiles?: Partial<Record<FinancialRiskIndicator, PercentileData>>;
  chartMetadata?: Partial<
    Record<FinancialRiskIndicator, FinancialChartMetadata>
  >;
  financialResults?: PRAFinancialResults;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
      }}
    >
      <Box
        px="md"
        py="xs"
        style={{
          ...RISK_ROW_GRID,
          backgroundColor: "var(--mantine-color-gray-0)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <MetricEyebrow>Indicator</MetricEyebrow>
        <MetricEyebrow>P10 to P90</MetricEyebrow>
        <MetricEyebrow ta="right">P10</MetricEyebrow>
        <MetricEyebrow ta="right">P90</MetricEyebrow>
      </Box>
      {configs.map((config, index) => (
        <RiskRangeRow
          key={config.indicator}
          config={config}
          percentiles={
            percentiles?.[config.indicator] ??
            chartMetadata?.[config.indicator]?.statistics
          }
          pointValue={getPointForecastValue(financialResults, config.indicator)}
          last={index === configs.length - 1}
        />
      ))}
    </Box>
  );
}

function RiskRangeRow({
  config,
  percentiles,
  pointValue,
  last,
}: {
  config: IndicatorConfig;
  percentiles?: PercentileData;
  pointValue?: number;
  last: boolean;
}) {
  const concept = relifeConcepts[config.conceptId];
  const hasRange = hasPercentileData(percentiles);

  return (
    <Box
      px="md"
      py="sm"
      style={{
        ...RISK_ROW_GRID,
        alignItems: "center",
        borderBottom: last
          ? undefined
          : "1px solid var(--mantine-color-gray-1)",
      }}
    >
      <Stack gap={1} style={{ minWidth: 0 }}>
        <Group gap={4} wrap="nowrap">
          <ConceptLabel
            conceptId={config.conceptId}
            size="xs"
            withExplainer={false}
          />
          <ConceptExplainer conceptId={config.conceptId} professional />
        </Group>
        <Text
          fz={17}
          fw={700}
          c={`${config.color}.7`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {pointValue !== undefined
            ? config.formatter(pointValue)
            : config.formatter(percentiles?.P50 ?? 0)}
        </Text>
      </Stack>
      {hasRange ? (
        <>
          <RangeIndicator
            min={percentiles.P10}
            median={percentiles.P50}
            max={percentiles.P90}
            formatter={config.formatter}
            color={config.color}
            lowerIsBetter={config.lowerIsBetter}
            size="sm"
            showLabels={false}
          />
          <BoundCell value={config.formatter(percentiles.P10)} />
          <BoundCell value={config.formatter(percentiles.P90)} />
        </>
      ) : (
        <Text size="xs" c="dimmed" style={{ gridColumn: "2 / -1" }}>
          {concept.label} range was not returned.
        </Text>
      )}
    </Box>
  );
}

function BoundCell({ value }: { value: string }) {
  return (
    <Text
      size="xs"
      c="dimmed"
      ta="right"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Text>
  );
}

function ProbabilityRow({ label, value }: { label: string; value: number }) {
  const percent = Math.max(
    0,
    Math.min(PROBABILITY_BAR_MAX, value * PROBABILITY_PERCENT_FACTOR),
  );

  return (
    <Stack gap={4}>
      <Group justify="space-between" gap="sm">
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" fw={600}>
          {formatPercent(percent)}
        </Text>
      </Group>
      <Progress value={percent} color="relife" size="sm" radius="xl" />
    </Stack>
  );
}

function HistogramPanel({
  config,
  chartMetadata,
  histogramIndicators,
  activeHistogramIndicator,
  onSelectIndicator,
}: {
  config: IndicatorConfig;
  chartMetadata?: FinancialChartMetadata;
  histogramIndicators: IndicatorConfig[];
  activeHistogramIndicator: FinancialRiskIndicator;
  onSelectIndicator: (value: FinancialRiskIndicator | null) => void;
}) {
  if (!chartMetadata) {
    return null;
  }

  const chartData = chartMetadata.bins.centers.map((center, index) => ({
    bin: config.formatter(center),
    frequency: chartMetadata.bins.counts[index] ?? 0,
  }));
  const chartTitle =
    chartMetadata.chart_config?.title ?? relifeConcepts[config.conceptId].label;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Group gap="xs">
          <IconChartHistogram size={16} />
          <MetricEyebrow>{chartTitle}</MetricEyebrow>
        </Group>
        {histogramIndicators.length > 1 ? (
          <Select
            aria-label="Select risk distribution"
            size="xs"
            w={180}
            value={activeHistogramIndicator}
            data={histogramIndicators.map(({ indicator, conceptId }) => ({
              value: indicator,
              label: relifeConcepts[conceptId].label,
            }))}
            onChange={(value) =>
              onSelectIndicator(value as FinancialRiskIndicator | null)
            }
          />
        ) : null}
      </Group>
      <BarChart
        h={RISK_CHART_HEIGHT}
        data={chartData}
        dataKey="bin"
        series={HISTOGRAM_SERIES}
        tickLine="none"
        gridAxis="y"
        withLegend={false}
        xAxisLabel={chartMetadata.chart_config?.xlabel}
        yAxisLabel={chartMetadata.chart_config?.ylabel ?? "Frequency"}
        valueFormatter={(value) => formatDecimal(value)}
      />
    </Stack>
  );
}

function getPointForecastValue(
  financialResults: PRAFinancialResults | undefined,
  indicator: FinancialRiskIndicator,
): number | undefined {
  const pointForecasts = financialResults?.riskAssessment?.pointForecasts;
  if (!pointForecasts) {
    return undefined;
  }

  return pointForecasts[indicator];
}

function hasPercentileData(
  data: PercentileData | undefined,
): data is PercentileData {
  return (
    data !== undefined &&
    Number.isFinite(data.P10) &&
    Number.isFinite(data.P50) &&
    Number.isFinite(data.P90)
  );
}

function hasProbabilities(
  probabilities: Record<string, number> | undefined,
): probabilities is Record<string, number> {
  return (
    probabilities !== undefined &&
    Object.values(probabilities).some((value) => Number.isFinite(value))
  );
}
