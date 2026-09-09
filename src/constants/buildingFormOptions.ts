/**
 * Shared building-input form options.
 *
 * Used by both the HRA and PRA building-input forms so the apartment-location
 * choices and the apartment-category predicate stay consistent across tools.
 */

import { findCategoryDef } from "./archetypeCategories";

/** Floor-position choices for individual apartments. */
export const APARTMENT_LOCATION_OPTIONS: { value: string; label: string }[] = [
  { value: "bottom", label: "Bottom floor" },
  { value: "middle", label: "Middle floor" },
  { value: "top", label: "Top floor" },
];

/**
 * Whether a category models an individual apartment rather than a whole
 * building. Null-safe so callers can pass an unresolved category.
 */
export function isApartmentLikeCategory(category: string | null): boolean {
  return category ? (findCategoryDef(category)?.apartmentLike ?? false) : false;
}

/**
 * Prefill for an apartment floor-area input, modeling one flat rather than
 * the whole reference building.
 * Callers cap it at the archetype's own floor area.
 */
export const DEFAULT_FLAT_FLOOR_AREA = 80;
