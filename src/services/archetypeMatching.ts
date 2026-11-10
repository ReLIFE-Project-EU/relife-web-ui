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
  /** No archetype in the country; the nearest one of the same category. */
  OTHER_COUNTRY: "other-country",
  /** User-selected archetype was not present in the live catalogue. */
  SELECTED_NOT_FOUND: "selected-not-found",
} as const;

export type ArchetypeMatchStrategy =
  (typeof ArchetypeMatchStrategy)[keyof typeof ArchetypeMatchStrategy];
