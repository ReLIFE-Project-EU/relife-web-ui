/** Shared appraisal readings for UI and CSV exports. */

import type { AppraisedPackage, PackageAppraisal } from "../types/renovation";
import type { PooledPayback } from "../utils/financialCalculations";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatYears,
} from "../utils/formatters";
import {
  savingsAvailabilityExplanation,
  skipReasonAvailability,
  type SkippedAvailability,
} from "./savingsState";

export type AppraisalMetric =
  | "NPV"
  | "IRR"
  | "ROI"
  | "PBP"
  | "DPP"
  | "MonthlyAvgSavings";

export type Reading =
  | { kind: "value"; metric: AppraisalMetric; value: number }
  | { kind: "over-lifetime"; lifetimeYears: number }
  /** Zero payback means no upfront investment. */
  | { kind: "immediate" }
  | {
      kind: "not-applicable";
      cause: "no-upfront-investment" | "over-lifetime";
      lifetimeYears: number;
    }
  | { kind: "skipped"; availability: SkippedAvailability }
  | { kind: "unavailable"; cause?: "missing-cash-flow" };

/** A P10–P90 range, absent when both ends are beyond the lifetime. */
export interface MetricRange {
  low: number;
  median: number;
  high: number;
  format: (value: number) => string;
  text: string;
}

const PERCENT_PER_RATIO = 100;

export function readMetric(
  appraisal: PackageAppraisal | undefined,
  metric: AppraisalMetric,
): Reading {
  if (!appraisal) return { kind: "unavailable" };
  if (appraisal.kind === "skipped") {
    return {
      kind: "skipped",
      availability: skipReasonAvailability(appraisal.reason),
    };
  }
  return readValue(appraisal, metric, appraisal.pointForecasts[metric]);
}

/** Formats raw percentiles and chart values like their point forecast. */
export function metricFormatter(
  appraisal: AppraisedPackage,
  metric: AppraisalMetric,
): (value: number) => string {
  return (value) => readingText(readValue(appraisal, metric, value));
}

export function readRange(
  appraisal: PackageAppraisal | undefined,
  metric: Exclude<AppraisalMetric, "MonthlyAvgSavings">,
): MetricRange | undefined {
  if (appraisal?.kind !== "appraised") return undefined;
  const percentiles = appraisal.percentiles?.[metric];
  if (
    !percentiles ||
    ![percentiles.P10, percentiles.P50, percentiles.P90].every(Number.isFinite)
  ) {
    return undefined;
  }
  const low = readValue(appraisal, metric, percentiles.P10);
  const high = readValue(appraisal, metric, percentiles.P90);
  if (low.kind === "over-lifetime" && high.kind === "over-lifetime") {
    return undefined;
  }
  return {
    low: percentiles.P10,
    median: percentiles.P50,
    high: percentiles.P90,
    format: metricFormatter(appraisal, metric),
    // A zero low end is a year count here, not the "immediate" headline.
    text: `${low.kind === "immediate" ? formatMetricValue(metric, 0) : readingText(low)} to ${lowerFirst(readingText(high))}`,
  };
}

export function readPooledPayback(pooled: PooledPayback | undefined): Reading {
  switch (pooled?.kind) {
    case undefined:
      return { kind: "unavailable" };
    case "missing-series":
      return { kind: "unavailable", cause: "missing-cash-flow" };
    case "over-lifetime":
      return { kind: "over-lifetime", lifetimeYears: pooled.lifetimeYears };
    case "years":
      return pooled.years === 0
        ? { kind: "immediate" }
        : { kind: "value", metric: "PBP", value: pooled.years };
  }
}

function readValue(
  appraisal: AppraisedPackage,
  metric: AppraisalMetric,
  value: number | null,
): Reading {
  const lifetimeYears = appraisal.metadata.project_lifetime;
  if (value === null) {
    const noUpfront = appraisal.cashFlowData?.initial_investment === 0;
    return {
      kind: "not-applicable",
      cause: noUpfront ? "no-upfront-investment" : "over-lifetime",
      lifetimeYears,
    };
  }
  if (metric === "PBP" || metric === "DPP") {
    // Financial reports "never pays back" as lifetime + 1, and interpolated
    // percentiles can land anywhere above the lifetime.
    if (!Number.isFinite(value) || value > lifetimeYears) {
      return { kind: "over-lifetime", lifetimeYears };
    }
    if (value === 0) return { kind: "immediate" };
  }
  return { kind: "value", metric, value };
}

export function formatMetricValue(
  metric: AppraisalMetric,
  value: number,
): string {
  switch (metric) {
    case "NPV":
      return formatCurrency(value);
    case "IRR":
    case "ROI":
      return formatPercent(value * PERCENT_PER_RATIO);
    case "PBP":
    case "DPP":
      return formatYears(value);
    case "MonthlyAvgSavings":
      return `${formatCurrency(value)}/mo`;
  }
}

export function readingText(reading: Reading): string {
  return renderReading(reading).text;
}

export function readingHint(reading: Reading): string | undefined {
  return renderReading(reading).hint;
}

/** A CSV cell: real values stay numbers, special readings write the screen text. */
export function readingCsvValue(reading: Reading): number | string | undefined {
  return renderReading(reading).csvValue;
}

function renderReading(reading: Reading) {
  switch (reading.kind) {
    case "value":
      return {
        text: formatMetricValue(reading.metric, reading.value),
        csvValue: reading.value,
      };
    case "over-lifetime": {
      const text = `Over ${formatNumber(reading.lifetimeYears)} years`;
      return {
        text,
        hint: beyondLifetimeSentence(reading.lifetimeYears),
        csvValue: text,
      };
    }
    case "immediate":
      return { text: "Immediate (no upfront investment)", csvValue: 0 };
    case "not-applicable":
      return {
        text: "n/a",
        hint:
          reading.cause === "no-upfront-investment"
            ? "Not applicable: no upfront investment"
            : `Not applicable: ${lowerFirst(beyondLifetimeSentence(reading.lifetimeYears))}`,
        csvValue: "n/a",
      };
    case "skipped":
      return {
        text: "—",
        hint: savingsAvailabilityExplanation[reading.availability],
      };
    case "unavailable":
      return {
        text: "—",
        hint:
          reading.cause === "missing-cash-flow"
            ? "A building has no cash flows, so portfolio payback cannot be calculated."
            : undefined,
      };
  }
}

function beyondLifetimeSentence(lifetimeYears: number): string {
  return `Does not pay back within the ${formatNumber(lifetimeYears)}-year project lifetime.`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
