/**
 * Portfolio Renovation Advisor Constants
 */

import type { OutputLevel } from "../../utils/apiMappings";

export const PRA_OUTPUT_LEVEL: OutputLevel = "professional";
export const PRA_CONCURRENCY_LIMIT = 3;
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
  "construction_year",
  "number_of_floors",
  "property_type",
] as const;

export const CSV_OPTIONAL_COLUMNS = [
  "archetype_name",
  "floor_number",
  "capex",
  "annual_maintenance_cost",
] as const;
