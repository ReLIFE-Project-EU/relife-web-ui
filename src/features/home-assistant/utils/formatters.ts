/**
 * HRA health formatting and re-exports from shared utils.
 */
import { formatFixed } from "../../../utils/formatters";

export * from "../../../utils/formatters";

const DAYS_PER_DALY = 365;
const ABSOLUTE_DECIMALS = 2;

export function toHealthyLifeDays(
  daly: number | undefined,
): number | undefined {
  return daly === undefined ? undefined : daly * DAYS_PER_DALY;
}

export function formatHealthyLifeDays(value: number | undefined): string {
  if (value === undefined) return "Unavailable";
  if (value === 0) return "0.00 days lost";
  if (Math.abs(value) < 0.005) return "<0.01 days lost";
  return `≈${formatFixed(value, ABSOLUTE_DECIMALS)} days lost`;
}
