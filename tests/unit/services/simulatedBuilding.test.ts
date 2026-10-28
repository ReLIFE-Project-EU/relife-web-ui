import { describe, expect, test } from "vitest";

import {
  energyScaleFactor,
  envelopeForPricing,
  modeledPvKwp,
  simulatedFloorArea,
  simulatedPvKwp,
  type SimulatedBuilding,
} from "../../../src/services/simulatedBuilding";
import type { BuildingPayload } from "../../../src/types/archetype";
import { surfaceAreasFromBui } from "../../../src/utils/archetypeModifier";

function building(params: {
  category: string;
  netFloorArea: number;
  modeledFloorArea: number;
  roofArea: number;
}): SimulatedBuilding {
  return {
    archetype: { category: params.category, country: "Greece", name: "GR" },
    bui: {
      building: { net_floor_area: params.netFloorArea, exposed_perimeter: 40 },
      building_surface: [
        {
          name: "Roof",
          type: "opaque",
          area: params.roofArea,
          sky_view_factor: 1,
          orientation: { azimuth: 0, tilt: 0 },
        },
        {
          name: "Wall",
          type: "opaque",
          area: 100,
          sky_view_factor: 0.5,
          orientation: { azimuth: 0, tilt: 90 },
        },
      ],
    } as unknown as BuildingPayload,
    modeledFloorArea: params.modeledFloorArea,
  };
}

describe("simulatedBuilding", () => {
  test("reads the simulated floor area from the BUI it ran", () => {
    const flat = building({
      category: "Apartment buildings",
      netFloorArea: 400,
      modeledFloorArea: 100,
      roofArea: 50,
    });

    expect(simulatedFloorArea(flat)).toBe(400);
    expect(energyScaleFactor(flat)).toBe(0.25);
  });

  // Clamping the whole roof before taking the share keeps a flat's PV cost
  // equal to the output it is credited with, instead of a 3 kWp minimum.
  test("sizes the whole roof for Forecasting and the home's share for cost", () => {
    const flat = building({
      category: "Apartment buildings",
      netFloorArea: 400,
      modeledFloorArea: 100,
      roofArea: 50,
    });

    expect(simulatedPvKwp(flat)).toBe(3);
    expect(modeledPvKwp(flat)).toBeCloseTo(0.75, 6);
    expect(
      modeledPvKwp({ ...flat, bui: { ...flat.bui, building_surface: [] } }),
    ).toBeNull();
  });

  test("prices the envelope as simulated when the factor is 1", () => {
    const house = building({
      category: "Single Family House",
      netFloorArea: 150,
      modeledFloorArea: 150,
      roofArea: 80,
    });

    const envelope = envelopeForPricing(house);
    expect(envelope.bui).toBe(house.bui);
    expect(envelope.floorArea).toBe(150);
  });

  test("scales the envelope like the energy results for any category", () => {
    for (const category of ["Apartment buildings", "Single Family House"]) {
      const share = building({
        category,
        netFloorArea: 200,
        modeledFloorArea: 100,
        roofArea: 80,
      });

      const envelope = envelopeForPricing(share);
      expect(surfaceAreasFromBui(envelope.bui)).toMatchObject({
        roofM2: 40,
        wallM2: 50,
      });
      expect(envelope.floorArea).toBe(100);
    }
  });
});
