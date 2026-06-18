/**
 * Portfolio Renovation Advisor Constants
 */

import type { OutputLevel } from "../../utils/apiMappings";

export const PRA_OUTPUT_LEVEL: OutputLevel = "professional";
export const PRA_CONCURRENCY_LIMIT = 2;
export const PRA_DEFAULT_PROJECT_LIFETIME = 20;

export type FinancingScheme = "debt" | "equity" | "epc" | "leasing" | "ppa";

export const FINANCING_SCHEMES: Array<{
  id: FinancingScheme;
  label: string;
  description: string;
  supported: boolean;
}> = [
  {
    id: "equity",
    label: "Equity",
    description: "Self-funded renovation. No financing costs.",
    supported: true,
  },
  {
    id: "debt",
    label: "Debt",
    description: "Loan-financed renovation. Configure loan terms.",
    supported: true,
  },
  {
    id: "epc",
    label: "EPC",
    description: "Energy Performance Contract. Repaid through energy savings.",
    supported: false,
  },
  {
    id: "leasing",
    label: "Leasing",
    description: "Equipment leasing arrangement.",
    supported: false,
  },
  {
    id: "ppa",
    label: "PPA",
    description: "Power Purchase Agreement for renewable energy.",
    supported: false,
  },
];

// CSV column schema
export const CSV_REQUIRED_COLUMNS = [
  "building_name",
  "lat",
  "lng",
  "category",
  "country",
  "floor_area",
  "construction_period",
  "number_of_floors",
] as const;

/**
 * Archetype categories accepted in CSV uploads.
 *
 * These values are the canonical labels used by the Financial API's archetype
 * catalog and must be passed through unchanged. The mixed casing
 * (`"Multi family House"` with lowercase `f`, `"Single Family House"` with
 * uppercase `F`) reflects the upstream values — do not normalize.
 */
export const CSV_VALID_CATEGORIES = [
  "Single Family House",
  "Multi family House",
  "Apartment",
] as const;

export type ArchetypeCategory = (typeof CSV_VALID_CATEGORIES)[number];

const CATEGORY_LOOKUP = new Map<string, ArchetypeCategory>(
  CSV_VALID_CATEGORIES.map((c) => [normalizeCategoryKey(c), c]),
);

function normalizeCategoryKey(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Resolve a user-supplied category string to its canonical form.
 * Tolerates case differences and irregular whitespace. Returns `undefined`
 * if the input does not match any accepted category.
 */
export function normalizeArchetypeCategory(
  input: string,
): ArchetypeCategory | undefined {
  return CATEGORY_LOOKUP.get(normalizeCategoryKey(input));
}

export const CSV_OPTIONAL_COLUMNS = [
  "archetype_name",
  "floor_number",
  "capex",
  "annual_maintenance_cost",
  "measures",
] as const;
