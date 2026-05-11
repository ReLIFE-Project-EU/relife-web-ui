/**
 * Archetype matching strategy taxonomy.
 *
 * `findMatchingArchetype` (and `resolveSelectedArchetype`) in EnergyService
 * use this to classify how an archetype was selected for a building.
 * The audit-log "reason" payloads consume these values directly, so adding
 * a new strategy automatically extends both the code and the audit trail.
 *
 * Implemented as a const object (not a TS `enum`) because the project has
 * `erasableSyntaxOnly` enabled — `enum` is not erasable at build time.
 */
export const ArchetypeMatchStrategy = {
  /** User explicitly picked an archetype that exists in the catalogue. */
  USER_SELECTED: "user-selected",
  /** Same country, same category, and same construction period. */
  EXACT_FULL: "exact-full",
  /** Same country and same category, but different construction period. */
  EXACT_CATEGORY_PERIOD_MISMATCH: "exact-category-period-mismatch",
  /** Same country, but a different building category. */
  COUNTRY_ANY_CATEGORY: "country-any-category",
  /** A different country in the same climate region, same category. */
  REGION_CATEGORY_MATCH: "region-category-match",
  /** A different country in the same climate region, any category. */
  REGION_ANY_MATCH: "region-any-match",
  /** User-selected archetype was not present in the live catalogue. */
  SELECTED_NOT_FOUND: "selected-not-found",
} as const;

export type ArchetypeMatchStrategy =
  (typeof ArchetypeMatchStrategy)[keyof typeof ArchetypeMatchStrategy];

/**
 * Extract the construction period from an archetype name, normalised to
 * the same form `normalizeConstructionPeriod` produces (e.g. "1946-1969").
 *
 * Archetype names in the Forecasting service catalogue carry their period
 * as a trailing `_YYYY_YYYY` suffix (e.g. `SFH_Greece_1946_1969`,
 * `ES_SFH_1946_1969`). Names without a recognisable suffix return undefined.
 */
export function extractArchetypePeriod(
  archetypeName: string,
): string | undefined {
  const match = archetypeName.match(/(\d{4})[_-](\d{4})(?!\d)/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}
