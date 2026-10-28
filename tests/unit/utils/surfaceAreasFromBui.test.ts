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
  tilt: number,
  skyViewFactor: number,
): BuildingSurface {
  return {
    name,
    type,
    area,
    u_value: 1,
    sky_view_factor: skyViewFactor,
    orientation: { azimuth: 0, tilt },
  };
}

describe("surfaceAreasFromBui", () => {
  test("groups the catalogue's ten surfaces by type and tilt", () => {
    // Every Forecasting archetype has exactly these ten surfaces.
    const bui = {
      building_surface: [
        surface("Roof surface", "opaque", 50, 0, 1),
        surface("Opaque north surface", "opaque", 30, 90, 0.5),
        surface("Opaque east surface", "opaque", 20, 90, 0.5),
        surface("Opaque south surface", "opaque", 30, 90, 0.5),
        surface("Opaque west surface", "opaque", 20, 90, 0.5),
        surface("Slab to ground", "opaque", 45, 0, 0),
        surface("Transparent north surface", "transparent", 2, 90, 0.5),
        surface("Transparent east surface", "transparent", 3, 90, 0.5),
        surface("Transparent south surface", "transparent", 8, 90, 0.5),
        surface("Transparent west surface", "transparent", 3, 90, 0.5),
      ],
    } as unknown as BuildingPayload;

    expect(surfaceAreasFromBui(bui)).toEqual({
      wallM2: 100,
      roofM2: 50,
      floorM2: 45,
      windowM2: 16,
    });
  });
});
