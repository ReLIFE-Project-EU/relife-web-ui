/**
 * API Mappings for Home Renovation Assistant
 *
 * Maps between UI-friendly values and API-required formats.
 * Reference: api-specs/20260108-125427/financial.json
 *
 * TBD INTEGRATION NOTES
 * =====================
 * These mappings are based on the current API specs. Update if:
 * - [ ] API PropertyType enum changes
 * - [ ] API EnergyClass enum changes
 * - [ ] Additional building types are added to UI
 */

// ─────────────────────────────────────────────────────────────────────────────
// Property Type Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * API PropertyType enum values (from financial.json)
 */
export type APIPropertyType =
  | "Loft"
  | "Studio / Bedsit"
  | "Villa"
  | "Apartment"
  | "Building"
  | "Other"
  | "Maisonette"
  | "Detached House"
  | "Apartment Complex";

/**
 * Maps UI building types to API PropertyType enum
 */
export const PROPERTY_TYPE_TO_API: Record<string, APIPropertyType> = {
  apartment: "Apartment",
  detached: "Detached House",
  "semi-detached": "Maisonette",
  terraced: "Building",
};

/**
 * Maps API PropertyType to UI building types
 */
export const PROPERTY_TYPE_FROM_API: Record<APIPropertyType, string> = {
  Apartment: "apartment",
  "Detached House": "detached",
  Maisonette: "semi-detached",
  Building: "terraced",
  // The following API types don't have direct UI equivalents yet
  // TBD: Add UI support for these property types if needed
  Loft: "apartment",
  "Studio / Bedsit": "apartment",
  Villa: "detached",
  Other: "detached",
  "Apartment Complex": "apartment",
};

/**
 * Convert UI building type to API PropertyType
 */
export function toAPIPropertyType(uiBuildingType: string): APIPropertyType {
  return PROPERTY_TYPE_TO_API[uiBuildingType] ?? "Other";
}

/**
 * Convert API PropertyType to UI building type
 */
export function fromAPIPropertyType(apiPropertyType: APIPropertyType): string {
  return PROPERTY_TYPE_FROM_API[apiPropertyType] ?? "detached";
}

// ─────────────────────────────────────────────────────────────────────────────
// EPC Class Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * API EnergyClass enum values (Greek labels from financial.json)
 * Ordered from worst (Η) to best (Α+)
 */
export type APIEnergyClass =
  | "Η"
  | "Ζ"
  | "Ε"
  | "Δ"
  | "Γ"
  | "Β"
  | "Β+"
  | "Α"
  | "Α+";

/**
 * UI EPC class labels
 */
export type UIEPCClass = "G" | "F" | "E" | "D" | "C" | "B" | "B+" | "A" | "A+";

/**
 * Maps UI EPC classes to API Greek labels
 * Note: Greek system has Β+ between Β and Α
 */
export const EPC_CLASS_TO_API: Record<UIEPCClass, APIEnergyClass> = {
  G: "Η",
  F: "Ζ",
  E: "Ε",
  D: "Δ",
  C: "Γ",
  B: "Β",
  "B+": "Β+",
  A: "Α",
  "A+": "Α+",
};

/**
 * Maps API Greek labels to UI EPC classes
 */
export const EPC_CLASS_FROM_API: Record<APIEnergyClass, UIEPCClass> = {
  Η: "G",
  Ζ: "F",
  Ε: "E",
  Δ: "D",
  Γ: "C",
  Β: "B",
  "Β+": "B+",
  Α: "A",
  "Α+": "A+",
};

/**
 * Convert UI EPC class to API Greek label
 */
export function toAPIEnergyClass(uiEPCClass: string): APIEnergyClass {
  return EPC_CLASS_TO_API[uiEPCClass as UIEPCClass] ?? "Δ"; // Default to D
}

/**
 * Convert API Greek label to UI EPC class
 */
export function fromAPIEnergyClass(apiEnergyClass: APIEnergyClass): UIEPCClass {
  return EPC_CLASS_FROM_API[apiEnergyClass] ?? "D"; // Default to D
}

// ─────────────────────────────────────────────────────────────────────────────
// Construction Year Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps construction period strings to approximate midpoint years
 */
export const CONSTRUCTION_PERIOD_TO_YEAR: Record<string, number> = {
  "pre-1945": 1930,
  "1945-1970": 1958,
  "1971-1990": 1980,
  "1991-2000": 1995,
  "2001-2010": 2005,
  "post-2010": 2018,
};

/**
 * Derive construction year from period string
 * Returns the midpoint year for the period
 */
export function deriveConstructionYear(period: string): number {
  return CONSTRUCTION_PERIOD_TO_YEAR[period] ?? 1980; // Default to 1980
}

/**
 * Derive construction period from year
 */
export function deriveConstructionPeriod(year: number): string {
  if (year < 1945) return "pre-1945";
  if (year <= 1970) return "1945-1970";
  if (year <= 1990) return "1971-1990";
  if (year <= 2000) return "1991-2000";
  if (year <= 2010) return "2001-2010";
  return "post-2010";
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Level
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Output levels for risk assessment
 * HRA tool uses "private" level
 */
export type OutputLevel = "private" | "professional" | "public" | "complete";

/**
 * Default output level for HRA tool
 */
export const HRA_OUTPUT_LEVEL: OutputLevel = "private";
