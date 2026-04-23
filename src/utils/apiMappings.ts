/**
 * API Mappings for Renovation Tools
 *
 * Maps between UI-friendly values and API-required formats.
 * Align with relife-financial-service enums and payloads (verify in repo).
 *
 * TBD INTEGRATION NOTES
 * =====================
 * These mappings follow the Financial service contract. Update if:
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
 * Ordered from worst (H) to best (A+)
 */
export type APIEnergyClass =
  | "\u0397"
  | "\u0396"
  | "\u0395"
  | "\u0394"
  | "\u0393"
  | "\u0392"
  | "\u0392+"
  | "\u0391"
  | "\u0391+";

/**
 * UI EPC class labels
 */
export type UIEPCClass = "G" | "F" | "E" | "D" | "C" | "B" | "B+" | "A" | "A+";

/**
 * Maps UI EPC classes to API Greek labels
 * Note: Greek system has B+ between B and A
 */
export const EPC_CLASS_TO_API: Record<UIEPCClass, APIEnergyClass> = {
  G: "\u0397",
  F: "\u0396",
  E: "\u0395",
  D: "\u0394",
  C: "\u0393",
  B: "\u0392",
  "B+": "\u0392+",
  A: "\u0391",
  "A+": "\u0391+",
};

/**
 * Maps API Greek labels to UI EPC classes
 */
export const EPC_CLASS_FROM_API: Record<APIEnergyClass, UIEPCClass> = {
  "\u0397": "G",
  "\u0396": "F",
  "\u0395": "E",
  "\u0394": "D",
  "\u0393": "C",
  "\u0392": "B",
  "\u0392+": "B+",
  "\u0391": "A",
  "\u0391+": "A+",
};

/**
 * Convert UI EPC class to API Greek label
 */
export function toAPIEnergyClass(uiEPCClass: string): APIEnergyClass {
  return EPC_CLASS_TO_API[uiEPCClass as UIEPCClass] ?? "\u0394"; // Default to D
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
 * Ordered list of construction period options for UI dropdowns and CSV validation.
 */
export const CONSTRUCTION_PERIODS = Object.keys(CONSTRUCTION_PERIOD_TO_YEAR);

export function normalizeConstructionPeriod(
  period?: string | null,
): string | undefined {
  if (!period) return undefined;

  const trimmed = period.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-");

  if (CONSTRUCTION_PERIOD_TO_YEAR[normalized] !== undefined) {
    return normalized;
  }

  const yearRangeMatch = normalized.match(/^(\d{4})-(\d{4})$/);
  if (yearRangeMatch) {
    return `${yearRangeMatch[1]}-${yearRangeMatch[2]}`;
  }

  const presentRangeMatch = normalized.match(/^(\d{4})-(present|now)$/);
  if (presentRangeMatch) {
    return `${presentRangeMatch[1]}-present`;
  }

  const preMatch = normalized.match(/^pre[- ]?(\d{4})$/);
  if (preMatch) {
    return `pre-${preMatch[1]}`;
  }

  const postMatch = normalized.match(/^post[- ]?(\d{4})$/);
  if (postMatch) {
    return `post-${postMatch[1]}`;
  }

  return normalized;
}

export function constructionPeriodsEqual(
  left?: string | null,
  right?: string | null,
): boolean {
  const normalizedLeft = normalizeConstructionPeriod(left);
  const normalizedRight = normalizeConstructionPeriod(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

export function compareConstructionPeriods(
  left?: string | null,
  right?: string | null,
): number {
  const normalizedLeft = normalizeConstructionPeriod(left);
  const normalizedRight = normalizeConstructionPeriod(right);

  if (!normalizedLeft && !normalizedRight) {
    return 0;
  }

  if (!normalizedLeft) {
    return 1;
  }

  if (!normalizedRight) {
    return -1;
  }

  const yearDifference =
    deriveConstructionYear(normalizedLeft) -
    deriveConstructionYear(normalizedRight);
  if (yearDifference !== 0) {
    return yearDifference;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

/**
 * Derive construction year from period string.
 * Handles both API-mapping periods ("1945-1970", "pre-1945") and
 * archetype-derived periods ("1946-1969") by computing the midpoint.
 */
export function deriveConstructionYear(period: string): number {
  const normalizedPeriod = normalizeConstructionPeriod(period) ?? period;

  // Check the known lookup table first
  if (CONSTRUCTION_PERIOD_TO_YEAR[normalizedPeriod] !== undefined) {
    return CONSTRUCTION_PERIOD_TO_YEAR[normalizedPeriod];
  }

  // Try parsing as "YYYY-YYYY" (archetype-derived format)
  const match = normalizedPeriod.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return Math.round((parseInt(match[1], 10) + parseInt(match[2], 10)) / 2);
  }

  const presentMatch = normalizedPeriod.match(/^(\d{4})-present$/);
  if (presentMatch) {
    const startYear = parseInt(presentMatch[1], 10);
    return Math.round((startYear + new Date().getFullYear()) / 2);
  }

  return 1980; // Default fallback
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
 */
export type OutputLevel = "private" | "professional" | "public" | "complete";
