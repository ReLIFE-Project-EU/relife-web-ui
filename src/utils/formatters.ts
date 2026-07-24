/**
 * Formatting utilities for renovation tools.
 * Provides consistent number, currency, and percentage formatting.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Browser-default formatters
// ─────────────────────────────────────────────────────────────────────────────

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export interface NumberSeparators {
  decimalSeparator: string;
  thousandSeparator: string;
}

function getBrowserNumberSeparators(): NumberSeparators {
  const parts = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    useGrouping: true,
  }).formatToParts(1234.5);
  return {
    decimalSeparator:
      parts.find((part) => part.type === "decimal")?.value ?? ".",
    thousandSeparator:
      parts.find((part) => part.type === "group")?.value ?? ",",
  };
}

/** Separators for Mantine NumberInput controls, derived from the browser locale. */
export const browserNumberSeparators = getBrowserNumberSeparators();

// ─────────────────────────────────────────────────────────────────────────────
// Number Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Format a number with one decimal place.
 */
export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

const fixedFormatterCache = new Map<number, Intl.NumberFormat>();

/**
 * Format a number with a fixed number of decimal places (locale-aware).
 */
export function formatFixed(value: number, decimals: number): string {
  let fmt = fixedFormatterCache.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedFormatterCache.set(decimals, fmt);
  }
  return fmt.format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a value as EUR currency (no decimals).
 * Example: 12500 -> "12.500 €" (de-DE), "€12,500" (en-IE)
 */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Format a value as approximate EUR currency, rounded to two significant
 * figures. Used for homeowner-facing headline figures, which should not imply
 * more precision than the model has.
 * Example: 1237 -> "€1,200"; 18432 -> "€18,000"; 47 -> "€47"
 */
export function formatApproxCurrency(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return formatCurrency(0);
  }

  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const step = Math.pow(10, Math.max(0, magnitude - 1));

  return formatCurrency(Math.round(value / step) * step);
}

// ─────────────────────────────────────────────────────────────────────────────
// Percentage Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a value as a percentage.
 * Example: 15.5 -> "15.5%"
 */
export function formatPercent(value: number): string {
  return `${formatDecimal(value)}%`;
}

/**
 * Format a value as a percentage with sign.
 * Example: 15.5 -> "+15.5%", -10 -> "-10.0%"
 */
export function formatPercentWithSign(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}%`;
}

/**
 * Calculate percentage change between two values.
 * Returns the percentage change from oldValue to newValue.
 */
export function calculatePercentChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Percentage reduction from a before/after pair, guarding for missing values
 * and a non-positive baseline. Returns undefined when it cannot be computed.
 */
export function getEnergyReduction(
  before: number | undefined,
  after: number | undefined,
): number | undefined {
  return before !== undefined && after !== undefined && before > 0
    ? calculatePercentChange(before, after)
    : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format energy value in kWh.
 * Example: 15000 -> "15,000 kWh"
 */
export function formatEnergy(value: number): string {
  return `${formatNumber(value)} kWh`;
}

/**
 * Format energy value per year.
 * Example: 15000 -> "15,000 kWh/year"
 */
export function formatEnergyPerYear(value: number): string {
  return `${formatNumber(value)} kWh/year`;
}

/**
 * Format energy intensity (per square meter per year).
 * Example: 150 -> "150 kWh/m²/year"
 */
export function formatEnergyIntensity(value: number): string {
  return `${formatNumber(value)} kWh/m²/year`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Area Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format floor area.
 * Example: 85 -> "85 m²"
 */
export function formatArea(value: number): string {
  return `${formatNumber(value)} m²`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format years.
 * Example: 10.5 -> "10.5 years"
 */
export function formatYears(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded)
    ? formatNumber(rounded)
    : formatDecimal(rounded);
  return `${formatted} ${rounded === 1 ? "year" : "years"}`;
}

/**
 * True when a payback indicator (PBP/DPP) means "never pays back within the
 * project horizon". The Financial service censors such simulations to
 * project_lifetime + 1 before computing percentiles, so any value beyond the
 * lifetime (or a non-finite one) is a censor artifact, not a real year count.
 */
export function isPaybackBeyondHorizon(
  value: number,
  projectLifetime: number | undefined,
): boolean {
  if (!Number.isFinite(value)) return true;
  return projectLifetime !== undefined && value > projectLifetime;
}

/**
 * Format a payback duration, rendering the censored "never pays back"
 * sentinel as a label instead of a fake year count.
 * Example: (10.5, 20) -> "10.5 years"; (21, 20) -> "No payback within horizon"
 */
export function formatPaybackYears(
  value: number,
  projectLifetime: number | undefined,
): string {
  return isPaybackBeyondHorizon(value, projectLifetime)
    ? "No payback within horizon"
    : formatYears(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// CO₂ Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format CO₂ value in tonnes. `decimal` keeps one fraction digit for
 * single-building magnitudes.
 * Example: 1250 -> "1,250 t CO₂e"; 2.53 with decimal -> "2.5 t CO₂e"
 */
export function formatTonnageCo2(
  value: number,
  options?: { decimal?: boolean },
): string {
  const formatted = options?.decimal
    ? formatDecimal(value)
    : formatNumber(value);
  return `${formatted} t CO₂e`;
}
