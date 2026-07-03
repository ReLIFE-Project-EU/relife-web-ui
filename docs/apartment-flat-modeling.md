# Apartment modeling in HRA: share-of-the-bill scaling

## Problem

Forecasting archetypes describe whole buildings. For apartment-like categories
("Multi family House", "Apartment buildings") the HRA previously prefilled the
archetype's full floor area as the user's home, so results described the entire
block (for `IE_AB_1980-1989`: 2,249 m² and hundreds of MWh/yr) instead of the
user's flat.

## Approach

Apartments are estimated as their **share of the whole-building simulation**
("share of the bill"): the archetype building is simulated on the regular,
well-exercised archetype path, and every energy result is scaled by
`flat area / building area` through the existing `areaScaleFactor` mechanism in
`EnergyService` and `RenovationService`. No custom-building payloads are sent.

A per-flat simulation (roof only for top floors, ground slab only for bottom
floors) was considered and deliberately deferred: it would route most apartment
users through the custom-BUI endpoints, which have no integration test
coverage today. See issue
[#63](https://github.com/ReLIFE-Project-EU/relife-web-ui/issues/63) for the
gated follow-up (integration tests first, feature flag).

## Implementation map

- **Selector flat mode** (`flatUnitMode` on `BuildingSelector`, set by HRA's
  `BuildingInfoStep`): for apartment-like selections the floor-area input
  describes the user's apartment (default 80 m², clamped to the building) and
  never registers as a building *modification*, keeping flats on the archetype
  simulation path. The "Apartment level" select is required (default middle)
  and feeds only the Financial API's `floor_number`. See
  `src/components/building-selector/buildingSelectorUtils.ts`
  (`isFlatUnitSelection`, `buildModifications`).
- **Validation** (`src/services/estimationValidation.ts`): scaling *down* an
  apartment-like building is the intended mechanism and carries no scale
  penalty (absolute bound: flat ≥ 10 m²). Scaling *up* keeps the regular
  archetype-mismatch confidence penalties, which also covers PRA whole-building
  rows.
- **Package costs** (`src/services/packageCostLookup.ts`,
  `scaleEnvelopeToFloorArea`): envelope measures are priced from the archetype
  surfaces scaled proportionally to the flat (via the existing
  `applyFloorAreaModification`), so costs match the linearly scaled savings.
  Only HRA opts in; PRA and RSE pricing is unchanged.

## Known error band

The building-average per-m² intensity over- or under-states individual flats by
roughly 10–25% depending on floor level (middle flats carry a share of roof and
ground losses they do not have). This is accepted for now; issue #63 removes it.

## Scope notes

- **PRA**: rows are whole buildings; correct as-is. Flat-level rows would need
  an explicit opt-in CSV column (see issue #63).
- **RSE**: whole-building × building-count semantics; unaffected.
