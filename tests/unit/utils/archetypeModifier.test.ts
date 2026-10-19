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
  applyGeometryModification,
  applySetpointModification,
  floorAreaPerFloor,
  surfaceAreasFromBui,
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
      volume: 300,
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
      construction: { thermal_bridge_heat_W_K: 10 },
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

const SIDES = [
  { side: "north", azimuth: 0 },
  { side: "east", azimuth: 90 },
  { side: "south", azimuth: 180 },
  { side: "west", azimuth: 270 },
];

/** Ten-surface envelope in the shape Forecasting archetypes use. */
function createEnvelopeBui(spec: {
  name: string;
  netFloorArea: number;
  floors: number;
  floorHeight: number;
  perimeter: number;
  footprint: number;
  wallPerSide: number;
  windowPerSide: number;
}): BuildingPayload {
  const base = createMockBui();
  return {
    ...base,
    building: {
      ...base.building,
      name: spec.name,
      net_floor_area: spec.netFloorArea,
      n_floors: spec.floors,
      height: spec.floors * spec.floorHeight,
      volume: spec.footprint * spec.floors * spec.floorHeight,
      exposed_perimeter: spec.perimeter,
    },
    building_surface: [
      createMockSurface({
        name: "Roof surface",
        type: "opaque",
        area: spec.footprint,
        sky_view_factor: 1,
        orientation: { azimuth: 0, tilt: 0 },
      }),
      createMockSurface({
        name: "Slab to ground",
        type: "opaque",
        area: spec.footprint,
        sky_view_factor: 0,
        orientation: { azimuth: 0, tilt: 0 },
      }),
      ...SIDES.flatMap(({ side, azimuth }) => [
        createMockSurface({
          name: `Opaque ${side} surface`,
          type: "opaque",
          area: spec.wallPerSide,
          orientation: { azimuth, tilt: 90 },
        }),
        createMockSurface({
          name: `Transparent ${side} surface`,
          type: "transparent",
          area: spec.windowPerSide,
          orientation: { azimuth, tilt: 90 },
        }),
      ]),
    ],
  };
}

// Source values from relife-forecasting-service building_examples.py.
const SFH_1946_1969 = createEnvelopeBui({
  name: "SFH_1946_1969",
  netFloorArea: 125,
  floors: 2,
  floorHeight: 2.7,
  perimeter: 46,
  footprint: 120,
  wallPerSide: 52.2,
  windowPerSide: 9.9,
});
const AT_SFH_1946_1969 = createEnvelopeBui({
  name: "AT_SFH_1946-1969",
  netFloorArea: 165.4,
  floors: 2,
  floorHeight: 2.7,
  perimeter: 39.4,
  footprint: 82.7,
  wallPerSide: 44.175,
  windowPerSide: 9.05,
});
/** AT_SFH_1946-1969 with Forecasting's catalogue U-values, ventilation and sizing. */
const AT_SFH_1946_1969_U: Record<string, number> = {
  Roof: 0.583,
  Slab: 0.84,
  Opaque: 0.986,
  Transparent: 1.582,
};
const AT_SFH_1946_1969_SIZED: BuildingPayload = {
  ...AT_SFH_1946_1969,
  building_surface: AT_SFH_1946_1969.building_surface.map((surface) => ({
    ...surface,
    u_value: AT_SFH_1946_1969_U[surface.name.split(" ")[0]],
  })),
  building_parameters: {
    ...AT_SFH_1946_1969.building_parameters,
    system_capacities: {
      heating_capacity: 18_700,
      cooling_capacity: 16_540,
      units: "W",
    },
    airflow_rates: { infiltration_rate: 0.8, units: "ACH" },
    construction: { thermal_bridge_heat_W_K: 37.83 },
  },
};
/** Target floor area from issue #86, compared against AT_SFH_1946-1969. */
const ISSUE_TARGET_FLOOR_AREA = 165;

/** Ratios the geometry assumptions keep constant across adjustments. */
function envelopeShape(bui: BuildingPayload) {
  const { roofM2, floorM2, wallM2, windowM2 } = surfaceAreasFromBui(bui);
  const { exposed_perimeter, height } = bui.building;
  const facadeM2 = wallM2 + windowM2;
  return {
    roofM2,
    floorM2,
    planShape: exposed_perimeter / Math.sqrt(floorM2),
    facadePerPerimeterHeight: facadeM2 / (exposed_perimeter * height),
    windowShare: windowM2 / facadeM2,
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
    floorHeight: 3,
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
        floorHeight: 4,
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

  // ---- applyGeometryModification ----

  describe("applyGeometryModification", () => {
    it.each([
      {
        label: "SFH_1946_1969 at the issue's target area",
        source: SFH_1946_1969,
        edit: { floorArea: ISSUE_TARGET_FLOOR_AREA },
      },
      {
        label: "AT_SFH_1946-1969 on 3 floors",
        source: AT_SFH_1946_1969,
        edit: { numberOfFloors: 3 },
      },
      {
        label: "AT_SFH_1946-1969 with 3 m floors",
        source: AT_SFH_1946_1969,
        edit: { floorHeight: 3 },
      },
      {
        label: "AT_SFH_1946-1969 at 200 m² on 3 floors",
        source: AT_SFH_1946_1969,
        edit: { floorArea: 200, numberOfFloors: 3 },
      },
    ])("$label follows the geometry assumptions", ({ source, edit }) => {
      const adjusted = applyGeometryModification(source, edit);
      const totalFloorArea = edit.floorArea ?? source.building.net_floor_area;
      const footprint = floorAreaPerFloor(
        totalFloorArea,
        adjusted.building.n_floors,
      );
      const before = envelopeShape(source);
      const after = envelopeShape(adjusted);

      expect(adjusted.building.net_floor_area).toBe(totalFloorArea);
      expect(after.roofM2).toBeCloseTo(footprint);
      expect(after.floorM2).toBeCloseTo(footprint);
      expect(after.planShape).toBeCloseTo(before.planShape);
      expect(after.facadePerPerimeterHeight).toBeCloseTo(
        before.facadePerPerimeterHeight,
      );
      expect(after.windowShare).toBeCloseTo(before.windowShare);
    });

    it("returns the source geometry when the inputs match the source", () => {
      const { net_floor_area, n_floors, height, exposed_perimeter } =
        AT_SFH_1946_1969.building;

      const adjusted = applyGeometryModification(AT_SFH_1946_1969, {
        floorArea: net_floor_area,
        numberOfFloors: n_floors,
        floorHeight: height / n_floors,
      });

      expect(adjusted.building.exposed_perimeter).toBeCloseTo(
        exposed_perimeter,
      );
      adjusted.building_surface.forEach((surface, i) => {
        expect(surface.area).toBeCloseTo(
          AT_SFH_1946_1969.building_surface[i].area,
        );
      });
    });

    it("keeps the source envelope size when no floor area is given", () => {
      // SFH_1946_1969 declares 125 m² on a 2 × 120 m² envelope; a height
      // edit must not shrink its roof and slab to the declared area.
      const before = surfaceAreasFromBui(SFH_1946_1969);

      const adjusted = applyGeometryModification(SFH_1946_1969, {
        floorHeight: 3,
      });
      const after = surfaceAreasFromBui(adjusted);

      expect(adjusted.building.net_floor_area).toBe(
        SFH_1946_1969.building.net_floor_area,
      );
      expect(after.roofM2).toBeCloseTo(before.roofM2);
      expect(after.floorM2).toBeCloseTo(before.floorM2);
    });
  });

  describe("applyAllModifications – sizing", () => {
    // Pins the resize to Forecasting's sizing: expected values come from its
    // _make_extended_building run on the resized geometry.
    it.each([
      {
        label: "80 m²",
        edit: { floorArea: 80 },
        volume: 216,
        thermalBridges: 22.807,
        heating: 11_200,
        cooling: 8_000,
      },
      {
        label: "one floor",
        edit: { numberOfFloors: 1 },
        volume: 446.58,
        thermalBridges: 48.134,
        heating: 19_700,
        cooling: 16_540,
      },
    ])(
      "sizes AT_SFH_1946-1969 at $label like Forecasting's catalogue",
      ({ edit, volume, thermalBridges, heating, cooling }) => {
        const { bui } = applyAllModifications(
          { ...createMockArchetypeDetails(), bui: AT_SFH_1946_1969_SIZED },
          edit,
        );
        const { construction, system_capacities } = bui.building_parameters;

        expect(bui.building.volume).toBeCloseTo(volume);
        expect(construction.thermal_bridge_heat_W_K).toBeCloseTo(
          thermalBridges,
        );
        // Forecasting rounds heating up to 100 W.
        expect(system_capacities.heating_capacity).toBeCloseTo(heating, -2);
        expect(system_capacities.cooling_capacity).toBeCloseTo(cooling);
      },
    );
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
