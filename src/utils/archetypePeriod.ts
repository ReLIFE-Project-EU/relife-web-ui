/**
 * Single parser for the construction period embedded in Forecasting
 * archetype names. Handles every catalogue naming generation:
 *   Legacy underscore: "SFH_0_1945", "SFH_Greece_1946_1969", "GR_SFH_1946_1969"
 *   New hyphenated:    "AT_SFH_0-1945", "AT_MFH_1980-1989", "AT_AB_2011-now"
 * Output uses the `normalizeConstructionPeriod` vocabulary:
 *   "pre-YYYY" | "YYYY-YYYY" | "YYYY-present" | null
 */
const PERIOD_SUFFIX = /(?:^|_)(0|\d{4})[_-](\d{4}|now)$/i;

export function extractArchetypePeriod(name: string): string | null {
  const match = name.match(PERIOD_SUFFIX);
  if (!match) return null;
  const [, start, end] = match;
  if (end.toLowerCase() === "now") return `${start}-present`;
  if (start === "0") return `pre-${end}`;
  return `${start}-${end}`;
}
