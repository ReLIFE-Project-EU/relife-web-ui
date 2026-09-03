import { describe, expect, test } from "vitest";

import {
  buildDraftFromDetails,
  buildModifications,
  buildSelection,
  mapApartmentLocationToFloorNumber,
} from "../../../src/components/building-selector/buildingSelectorUtils";
import { DEFAULT_FLAT_FLOOR_AREA } from "../../../src/constants/buildingFormOptions";
import type { ArchetypeDetails } from "../../../src/types/archetype";

function createDetails(
  overrides: Partial<ArchetypeDetails> = {},
): ArchetypeDetails {
  return {
    category: "Apartment buildings",
    country: "Ireland",
    name: "IE_AB_1980-1989",
    floorArea: 2248.94,
    numberOfFloors: 4.6,
    floorHeight: 2.7,
    totalWindowArea: 360.6,
    thermalProperties: { wallUValue: 0.6, roofUValue: 0.4, windowUValue: 4.8 },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    location: { lat: 53.1424, lng: -7.6921 },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
    ...overrides,
  };
}

describe("building selector flat-unit mode", () => {
  test("prefills the flat default area and a middle level for apartment-like details", () => {
    const draft = buildDraftFromDetails(createDetails(), undefined, undefined, {
      flatUnit: true,
    });

    expect(draft.floorArea).toBe(DEFAULT_FLAT_FLOOR_AREA);
    expect(draft.apartmentLocation).toBe("middle");
  });

  test("keeps the whole-building prefill for non-apartment details even with the flag on", () => {
    const details = createDetails({
      category: "Single Family House",
      floorArea: 150,
    });
    const draft = buildDraftFromDetails(details, undefined, undefined, {
      flatUnit: true,
    });

    expect(draft.floorArea).toBe(150);
    expect(draft.apartmentLocation).toBeNull();
  });

  test("never emits a floorArea modification in flat mode, keeping flats off the custom-BUI path", () => {
    const details = createDetails();
    const draft = buildDraftFromDetails(details, undefined, undefined, {
      flatUnit: true,
    });

    // 80 m2 vs 2248.94 m2 would register as a modification without the flag.
    expect(buildModifications(details, draft, "limited")).toMatchObject({
      floorArea: DEFAULT_FLAT_FLOOR_AREA,
    });
    expect(
      buildModifications(details, draft, "limited", { flatUnit: true }),
    ).toBeUndefined();
  });

  test("buildSelection carries the flat area and derives the floor number from the level", () => {
    const details = createDetails();
    const draft = buildDraftFromDetails(details, undefined, undefined, {
      flatUnit: true,
    });

    const selection = buildSelection({
      mode: "browse",
      details,
      draft,
      scope: "limited",
      country: "Ireland",
      constructionPeriod: "1980-1989",
      coords: details.location,
      flatUnit: true,
    });

    expect(selection.floorArea).toBe(DEFAULT_FLAT_FLOOR_AREA);
    expect(selection.modifications).toBeUndefined();
    expect(selection.apartmentLocation).toBe("middle");
    // middle of rounded 5-floor catalogue geometry -> floor(5 / 2) = 2
    expect(selection.floorNumber).toBe(2);
  });

  test("maps apartment levels from whole rounded floor counts", () => {
    expect(mapApartmentLocationToFloorNumber("bottom", 5.4)).toBe(0);
    expect(mapApartmentLocationToFloorNumber("middle", 5.4)).toBe(2);
    expect(mapApartmentLocationToFloorNumber("top", 5.4)).toBe(4);
  });
});
