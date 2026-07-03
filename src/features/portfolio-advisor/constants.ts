/**
 * Portfolio Renovation Advisor Constants
 */

import type { OutputLevel } from "../../utils/apiMappings";
import {
  ARCHETYPE_CATEGORIES,
  findCategoryDef,
  type ArchetypeBackendCategory,
} from "../../constants/archetypeCategories";

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
 * Archetype categories accepted in CSV uploads: the verbatim Forecasting
 * catalogue labels from the canonical category module. Legacy values such as
 * "Apartment" are accepted and resolved to their canonical form.
 */
export const CSV_VALID_CATEGORIES = ARCHETYPE_CATEGORIES.map(
  (category) => category.backendLabel,
);

export type ArchetypeCategory = ArchetypeBackendCategory;

/**
 * Resolve a user-supplied category string to its canonical form.
 * Tolerates case differences, irregular whitespace, short codes, and legacy
 * aliases. Returns `undefined` if the input does not match any accepted
 * category.
 */
export function normalizeArchetypeCategory(
  input: string,
): ArchetypeCategory | undefined {
  return findCategoryDef(input)?.backendLabel;
}

export const CSV_OPTIONAL_COLUMNS = [
  "archetype_name",
  "floor_number",
  "capex",
  "annual_maintenance_cost",
  "measures",
] as const;
