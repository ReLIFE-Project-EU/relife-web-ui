import { describe, expect, it } from "vitest";

import type {
  ArchetypeDetails,
  BuildingModifications,
  BuildingPayload,
  BuildingSurface,
  SystemPayload,
} from "../../../src/types/archetype";
import {
  applyAllModifications,
  applyFloorAreaModification,
  applySetpointModification,
  validateModifications,
} from "../../../src/utils/archetypeModifier";

function createMockSurface(
  overrides: Partial<BuildingSurface> & Pick<BuildingSurface, "name" | "type">,
): BuildingSurface {
  return {
    area: 20,
    u_value: 1.5,
    sky_view_factor: 0.5,
    orientation: { azimuth: 0, tilt: 90 },
    ...overrides,
  };
}

function createMockBui(): BuildingPayload {
  return {
    building: {
      name: "Test Building",
      latitude: 45.0,
      longitude: 9.0,
      net_floor_area: 100,
      n_floors: 2,
      height: 6,
      exposed_perimeter: 40,
      wall_thickness: 0.3,
      building_type_class: "SFH",
      construction_class: "1990_2000",
    },
    building_surface: [
      createMockSurface({
        name: "Opaque north surface",
        type: "opaque",
        area: 20,
        u_value: 1.5,
        orientation: { azimuth: 0, tilt: 90 },
      }),
      createMockSurface({
        name: "Opaque south surface",
        type: "opaque",
        area: 20,
        u_value: 1.5,
        orientation: { azimuth: 180, tilt: 90 },
      }),
      createMockSurface({
        name: "Opaque east surface",
        type: "opaque",
        area: 20,
        u_value: 1.5,
        orientation: { azimuth: 90, tilt: 90 },
      }),
      createMockSurface({
        name: "Opaque west surface",
        type: "opaque",
        area: 20,
        u_value: 1.5,
        orientation: { azimuth: 270, tilt: 90 },
      }),
      createMockSurface({
        name: "Opaque roof surface",
        type: "opaque",
        area: 50,
        u_value: 0.8,
        orientation: { azimuth: 0, tilt: 0 },
      }),
      createMockSurface({
        name: "Window north",
        type: "transparent",
        area: 5,
        u_value: 2.8,
        orientation: { azimuth: 0, tilt: 90 },
      }),
      createMockSurface({
        name: "Window south",
        type: "transparent",
        area: 5,
        u_value: 2.8,
        orientation: { azimuth: 180, tilt: 90 },
      }),
    ],
    building_parameters: {
      temperature_setpoints: {
        heating_setpoint: 20,
        heating_setback: 17,
        cooling_setpoint: 26,
        cooling_setback: 30,
        units: "C",
      },
      system_capacities: {
        heating_capacity: 10000,
        cooling_capacity: 8000,
        units: "W",
      },
      airflow_rates: {
        infiltration_rate: 0.5,
        units: "ACH",
      },
      internal_gains: [
        {
          name: "Occupancy",
          full_load: 120,
          weekday: [
            0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0,
            0,
          ],
          weekend: [
            0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
            0,
          ],
        },
      ],
    },
    units: { area: "m2", u_value: "W/m2K" },
  };
}

function createMockSystem(): SystemPayload {
  return {
    emitter_type: "radiator",
    nominal_power: 15000,
    emission_efficiency: 0.95,
    distribution_loss_coeff: 0.05,
    efficiency_model: { type: "constant", value: 0.9 },
  };
}

function createMockArchetypeDetails(): ArchetypeDetails {
  const bui = createMockBui();
  return {
    category: "Single Family House",
    country: "Italy",
    name: "SFH_Italy_1990_2000",
    floorArea: 100,
    numberOfFloors: 2,
    buildingHeight: 6,
    totalWindowArea: 10,
    thermalProperties: { wallUValue: 1.5, roofUValue: 0.8, windowUValue: 2.8 },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    location: { lat: 45.0, lng: 9.0 },
    bui,
    system: createMockSystem(),
  };
}

describe("archetypeModifier", () => {
  // ---- validateModifications ----

  describe("validateModifications", () => {
    it("25: returns isValid true for modifications within range", () => {
      const archetype = createMockArchetypeDetails();
      const mods: BuildingModifications = {
        floorArea: 150,
        numberOfFloors: 3,
        buildingHeight: 9,
        wallUValue: 1.0,
        roofUValue: 0.5,
        windowUValue: 2.0,
        heatingSetpoint: 18,
        coolingSetpoint: 26,
      };

      const result = validateModifications(mods, archetype);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("26: returns error when floorArea is below minimum (5 < 10)", () => {
      const archetype = createMockArchetypeDetails();
      const mods: BuildingModifications = { floorArea: 5 };

      const result = validateModifications(mods, archetype);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("floorArea");
    });

    it("27: returns error when window area exceeds 40% of wall area", () => {
      const archetype = createMockArchetypeDetails();
      // Total wall area = 4 walls × 20 = 80 m²; 40% = 32
      const mods: BuildingModifications = { totalWindowArea: 35 };

      const result = validateModifications(mods, archetype);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "totalWindowArea")).toBe(
        true,
      );
    });

    it("28: returns error when coolingSetpoint ≤ heatingSetpoint", () => {
      const archetype = createMockArchetypeDetails();
      const mods: BuildingModifications = {
        heatingSetpoint: 22,
        coolingSetpoint: 20,
      };

      const result = validateModifications(mods, archetype);

      expect(result.isValid).toBe(false);
      // coolingSetpoint=20 is also out of range [24,30], plus ≤ heating
      const coolingErrors = result.errors.filter(
        (e) => e.field === "coolingSetpoint",
      );
      expect(coolingErrors.length).toBeGreaterThanOrEqual(1);
      expect(
        coolingErrors.some((e) => e.message.includes("higher than heating")),
      ).toBe(true);
    });
  });

  // ---- applyFloorAreaModification ----

  describe("applyFloorAreaModification", () => {
    it("29: doubling floor area scales all surface areas by 2", () => {
      const bui = createMockBui();
      const originalAreas = bui.building_surface.map((s) => s.area);

      const result = applyFloorAreaModification(bui, 200);

      expect(result.building.net_floor_area).toBe(200);
      result.building_surface.forEach((surface, i) => {
        expect(surface.area).toBeCloseTo(originalAreas[i] * 2, 5);
      });
    });

    it("30: doubling floor area scales perimeter by √2", () => {
      const bui = createMockBui();

      const result = applyFloorAreaModification(bui, 200);

      const expected = 40 * Math.sqrt(2);
      expect(result.building.exposed_perimeter).toBeCloseTo(expected, 2);
    });
  });

  // ---- applyThermalModification (via applyAllModifications) ----

  describe("applyAllModifications – thermal", () => {
    it("31: wallUValue=0.5 updates only wall/cardinal surfaces, not roof or window", () => {
      const archetype = createMockArchetypeDetails();
      const mods: BuildingModifications = { wallUValue: 0.5 };

      const { bui } = applyAllModifications(archetype, mods);

      for (const surface of bui.building_surface) {
        const name = surface.name.toLowerCase();
        if (
          surface.type === "opaque" &&
          (name.includes("wall") ||
            name.includes("north") ||
            name.includes("south") ||
            name.includes("east") ||
            name.includes("west")) &&
          !name.includes("roof")
        ) {
          expect(surface.u_value).toBe(0.5);
        } else if (name.includes("roof")) {
          expect(surface.u_value).toBe(0.8);
        } else if (surface.type === "transparent") {
          expect(surface.u_value).toBe(2.8);
        }
      }
    });
  });

  // ---- applySetpointModification ----

  describe("applySetpointModification", () => {
    it("32: heat=20, cool=26 sets setbacks to 17 and 30", () => {
      const bui = createMockBui();

      const result = applySetpointModification(bui, 20, 26);

      const sp = result.building_parameters.temperature_setpoints;
      expect(sp.heating_setpoint).toBe(20);
      expect(sp.heating_setback).toBe(17);
      expect(sp.cooling_setpoint).toBe(26);
      expect(sp.cooling_setback).toBe(30);
    });
  });

  // ---- applyAllModifications – system deep copy ----

  describe("applyAllModifications – system copy", () => {
    it("33: system payload is a deep copy, not the same reference", () => {
      const archetype = createMockArchetypeDetails();
      const mods: BuildingModifications = {};

      const { system } = applyAllModifications(archetype, mods);

      expect(system).not.toBe(archetype.system);
      expect(system).toEqual(archetype.system);

      // Mutating the copy must not affect the original
      system.nominal_power = 99999;
      expect(archetype.system.nominal_power).toBe(15000);
    });
  });
});
