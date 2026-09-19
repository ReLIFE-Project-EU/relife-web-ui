/**
 * HRA health formatting and re-exports from shared utils.
 */
import { formatFixed } from "../../../utils/formatters";

export * from "../../../utils/formatters";

const DAYS_PER_DALY = 365;
const ABSOLUTE_DECIMALS = 2;
const CHANGE_DECIMALS = 1;

interface HealthChange {
  direction: "fall" | "rise";
  effect: "fewer" | "more";
  magnitude: string;
  color: "green.8" | "red.8";
}

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

function formatNumberForSentence(value: number, decimals: number): string {
  const threshold = 10 ** -decimals;
  if (value !== 0 && Math.abs(value) < threshold / 2) {
    return `<${formatFixed(threshold, decimals)}`;
  }
  return formatFixed(Math.abs(value), decimals);
}

export function getHealthChange(
  avoidedDays: number | undefined,
): HealthChange | undefined {
  if (avoidedDays === undefined || avoidedDays === 0) return undefined;
  const isImprovement = avoidedDays > 0;
  return {
    direction: isImprovement ? "fall" : "rise",
    effect: isImprovement ? "fewer" : "more",
    magnitude: formatNumberForSentence(avoidedDays, CHANGE_DECIMALS),
    color: isImprovement ? "green.8" : "red.8",
  };
}

export function formatHealthChange(
  avoidedDays: number | undefined,
  change: HealthChange | undefined,
): string {
  if (avoidedDays === undefined) return "Unavailable";
  if (avoidedDays === 0) return "No modeled change";
  const approximation = change?.magnitude.startsWith("<") ? "" : "≈";
  return `${approximation}${change?.magnitude} ${change?.effect} days lost per person/year`;
}

export function getHealthInterpretation(
  todayDays: number | undefined,
  afterDays: number | undefined,
  avoidedDays: number | undefined,
  change: HealthChange | undefined,
): string | undefined {
  if (
    todayDays === undefined ||
    afterDays === undefined ||
    avoidedDays === undefined
  ) {
    return undefined;
  }
  if (avoidedDays === 0) {
    return "We show the result as days. The before-and-after values are the same, so there is no modeled change in healthy-life days lost per person over a year.";
  }
  return `We show the result as days. A ${change?.direction} from ${formatNumberForSentence(todayDays, ABSOLUTE_DECIMALS)} to ${formatNumberForSentence(afterDays, ABSOLUTE_DECIMALS)} means ${change?.magnitude} ${change?.effect} healthy-life days lost per person over a year.`;
}
