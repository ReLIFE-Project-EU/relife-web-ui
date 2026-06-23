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

// ─────────────────────────────────────────────────────────────────────────────
// CO₂ Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format CO₂ value in tonnes.
 * Example: 1250 -> "1,250 t CO₂e"
 */
export function formatTonnageCo2(value: number): string {
  return `${formatNumber(value)} t CO₂e`;
}
