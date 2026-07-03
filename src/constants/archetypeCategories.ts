import type { APIPropertyType } from "../utils/apiMappings";

/**
 * Canonical knowledge about the Forecasting archetype categories.
 *
 * `backendLabel` values are the verbatim category strings returned by the
 * Forecasting service catalogue and must be passed through unchanged when
 * calling its endpoints (matching is exact and case-sensitive). The mixed
 * casing (`"Multi family House"` with lowercase `f`, `"Apartment buildings"`
 * with lowercase `b`) reflects the upstream values — do not normalize.
 */
interface ArchetypeCategoryShape {
  /** Short code used inside archetype names (e.g. `AT_SFH_0-1945`). */
  code: string;
  /** Verbatim Forecasting catalogue category string. */
  backendLabel: string;
  /** Human-readable label for UI display. */
  displayLabel: string;
  /** Whether the category needs a floor-position input. */
  apartmentLike: boolean;
  /** Financial API PropertyType for buildings of this category. */
  financialPropertyType: APIPropertyType;
}

export const ARCHETYPE_CATEGORIES = [
  {
    code: "SFH",
    backendLabel: "Single Family House",
    displayLabel: "Single-Family House",
    apartmentLike: false,
    financialPropertyType: "Detached House",
  },
  {
    code: "MFH",
    backendLabel: "Multi family House",
    displayLabel: "Multi-Family House",
    apartmentLike: true,
    financialPropertyType: "Apartment Complex",
  },
  {
    code: "AB",
    backendLabel: "Apartment buildings",
    displayLabel: "Apartment Building",
    apartmentLike: true,
    financialPropertyType: "Apartment Complex",
  },
] as const satisfies readonly ArchetypeCategoryShape[];

export type ArchetypeCategoryDef = (typeof ARCHETYPE_CATEGORIES)[number];

export type ArchetypeBackendCategory = ArchetypeCategoryDef["backendLabel"];

/** Legacy category values accepted as input and resolved to a canonical one. */
const CATEGORY_ALIASES: Record<string, ArchetypeBackendCategory> = {
  apartment: "Apartment buildings",
};

function normalizeCategoryKey(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

const CATEGORY_LOOKUP = new Map<string, ArchetypeCategoryDef>(
  ARCHETYPE_CATEGORIES.flatMap((category) => [
    [normalizeCategoryKey(category.backendLabel), category] as const,
    [normalizeCategoryKey(category.code), category] as const,
  ]),
);

/**
 * Resolve a category input (verbatim backend label, short code, or legacy
 * alias) to its canonical definition. Tolerates case differences and
 * irregular whitespace. Returns `undefined` for unknown inputs.
 */
export function findCategoryDef(
  input: string,
): ArchetypeCategoryDef | undefined {
  const key = normalizeCategoryKey(input);
  const aliased = CATEGORY_ALIASES[key];
  return CATEGORY_LOOKUP.get(aliased ? normalizeCategoryKey(aliased) : key);
}
