import { describe, expect, test } from "vitest";

import type {
  BuildingPayload,
  BuildingSurface,
} from "../../../src/types/archetype";
import { surfaceAreasFromBui } from "../../../src/utils/archetypeModifier";

function surface(
  name: string,
  type: BuildingSurface["type"],
  area: number,
  skyViewFactor = 0.5,
): BuildingSurface {
  return {
    name,
    type,
    area,
    u_value: 1,
    sky_view_factor: skyViewFactor,
    orientation: { azimuth: 0, tilt: 90 },
  };
}

describe("surfaceAreasFromBui", () => {
  test("groups surface areas by envelope element using name/type conventions", () => {
    // Only building_surface is read; cast the minimal fixture accordingly.
    const bui = {
      building_surface: [
        surface("Wall north", "opaque", 30),
        surface("Wall south", "opaque", 30),
        surface("Roof", "opaque", 50),
        surface("Ground slab", "opaque", 45),
        surface("Window south", "transparent", 8),
        surface("Window north", "transparent", 2),
      ],
    } as unknown as BuildingPayload;

    expect(surfaceAreasFromBui(bui)).toEqual({
      wallM2: 60,
      roofM2: 50,
      floorM2: 45,
      windowM2: 10,
    });
  });

  test("detects a ground floor by near-zero sky-view factor even when unnamed", () => {
    const bui = {
      building_surface: [
        surface("Wall", "opaque", 30, 0.5),
        // No 'slab'/'ground' in the name, but it sees no sky → floor.
        surface("Base", "opaque", 40, 0),
      ],
    } as unknown as BuildingPayload;

    const areas = surfaceAreasFromBui(bui);
    expect(areas.floorM2).toBe(40);
    expect(areas.wallM2).toBe(30);
  });
});
