import { useMemo, useState } from "react";
import {
  Alert,
  Card,
  Group,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { IconChartHistogram, IconInfoCircle } from "@tabler/icons-react";
import {
  ConceptExplainer,
  ConceptLabel,
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
    <Stack gap="md">
      <Stack gap={2}>
        <Text fw={600} size="sm">
          Professional risk analytics
        </Text>
        <Text size="xs" c="dimmed">
          Monte Carlo ranges and probability outputs from the financial risk
          assessment.
        </Text>
      </Stack>

      {availableIndicators.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {availableIndicators.map((config) => (
            <RiskRangeCard
              key={config.indicator}
              config={config}
              percentiles={
                percentiles?.[config.indicator] ??
                chartMetadata?.[config.indicator]?.statistics
              }
              pointValue={getPointForecastValue(
                financialResults,
                config.indicator,
              )}
            />
          ))}
        </SimpleGrid>
      ) : null}

      {hasProbabilities(probabilities) ? (
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Text fw={600} size="sm">
              Probability thresholds
            </Text>
            {Object.entries(probabilities)
              .filter(([, value]) => Number.isFinite(value))
              .map(([label, value]) => (
                <ProbabilityRow key={label} label={label} value={value} />
              ))}
          </Stack>
        </Card>
      ) : null}

      {activeHistogramIndicator ? (
        <HistogramCard
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
    </Stack>
  );
}

function RiskRangeCard({
  config,
  percentiles,
  pointValue,
}: {
  config: IndicatorConfig;
  percentiles?: PercentileData;
  pointValue?: number;
}) {
  const concept = relifeConcepts[config.conceptId];

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" gap="xs">
          <ConceptLabel
            conceptId={config.conceptId}
            size="xs"
            withExplainer={false}
          />
          <ConceptExplainer conceptId={config.conceptId} professional />
        </Group>
        <Text size="lg" fw={700} c={`${config.color}.7`}>
          {pointValue !== undefined
            ? config.formatter(pointValue)
            : config.formatter(percentiles?.P50 ?? 0)}
        </Text>
        {hasPercentileData(percentiles) ? (
          <RangeIndicator
            min={percentiles.P10}
            median={percentiles.P50}
            max={percentiles.P90}
            formatter={config.formatter}
            color={config.color}
            lowerIsBetter={config.lowerIsBetter}
            size="sm"
          />
        ) : (
          <Text size="xs" c="dimmed">
            {concept.label} range was not returned.
          </Text>
        )}
      </Stack>
    </Card>
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

function HistogramCard({
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
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          <Group gap="xs">
            <IconChartHistogram size={16} />
            <Text fw={600} size="sm">
              {chartTitle}
            </Text>
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
    </Card>
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
