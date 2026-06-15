/**
 * Shared building-input form options.
 *
 * Used by both the HRA and PRA building-input forms so the apartment-location
 * choices and the apartment-category predicate stay consistent across tools.
 */

/** Floor-position choices for apartment-like building categories. */
export const APARTMENT_LOCATION_OPTIONS: { value: string; label: string }[] = [
  { value: "bottom", label: "Bottom floor" },
  { value: "middle", label: "Middle floor" },
  { value: "top", label: "Top floor" },
];

/**
 * Whether a building category is apartment-like (and therefore needs a
 * floor-position input). Null-safe so callers can pass an unresolved category.
 */
export function isApartmentLikeCategory(category: string | null): boolean {
  return category === "Multi family House" || category === "Apartment";
}
