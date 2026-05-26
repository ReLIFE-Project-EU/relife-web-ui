import { describe, expect, test } from "vitest";

import { RSE_MVP_MEASURE_COST_ASSUMPTIONS } from "../../../../../src/features/strategy-explorer/constants";
import {
  computePackageCost,
  RSEPackageCatalogError,
  RSE_PACKAGES,
} from "../../../../../src/features/strategy-explorer/services/rsePackageCatalog";
import type { ArchetypeDetails } from "../../../../../src/types/archetype";

function makeArchetypeDetails(floorArea: number): ArchetypeDetails {
  return {
    country: "IT",
    category: "Residential",
    name: "Detached 1980",
    floorArea,
    numberOfFloors: 1,
    floorHeight: 3,
    totalWindowArea: 20,
    thermalProperties: {
      wallUValue: 0.8,
      roofUValue: 0.6,
      windowUValue: 2.8,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 16,
      coolingSetpoint: 26,
      coolingSetback: 28,
    },
    location: { lat: 41.9, lng: 12.5 },
    bui: {} as unknown as ArchetypeDetails["bui"],
    system: {} as unknown as ArchetypeDetails["system"],
  };
}

describe("RSE_PACKAGES", () => {
  test("contains all four MVP packages", () => {
    expect(Object.keys(RSE_PACKAGES).sort()).toEqual([
      "combined",
      "envelope",
      "systems-boiler",
      "systems-heat-pump",
    ]);
  });

  test("envelope package contains only envelope measures", () => {
    const pkg = RSE_PACKAGES.envelope;
    expect(pkg.measureIds).toEqual([
      "wall-insulation",
      "roof-insulation",
      "floor-insulation",
      "windows",
    ]);
  });

  test("combined package contains envelope + heat pump + pv", () => {
    const pkg = RSE_PACKAGES.combined;
    expect(pkg.measureIds).toEqual([
      "wall-insulation",
      "roof-insulation",
      "floor-insulation",
      "windows",
      "air-water-heat-pump",
      "pv",
    ]);
  });
});

describe("computePackageCost", () => {
  test("envelope package cost uses floorArea basis", () => {
    const details = makeArchetypeDetails(100);
    const result = computePackageCost("envelope", details);

    // wall-insulation: 70 * 100 = 7_000
    // roof-insulation: 50 * 100 = 5_000
    // floor-insulation: 35 * 100 = 3_500
    // windows: 65 * 100 = 6_500
    // Total capex = 22_000
    expect(result.capexEur).toBe(22_000);
    expect(result.annualMaintenanceEur).toBe(0);
  });

  test("systems-heat-pump package cost uses building basis", () => {
    const details = makeArchetypeDetails(100);
    const result = computePackageCost("systems-heat-pump", details);

    // air-water-heat-pump: 22_000 flat
    expect(result.capexEur).toBe(22_000);
    expect(result.annualMaintenanceEur).toBe(300);
  });

  test("systems-boiler package cost uses building basis", () => {
    const details = makeArchetypeDetails(100);
    const result = computePackageCost("systems-boiler", details);

    // condensing-boiler: 6_500 flat
    expect(result.capexEur).toBe(6_500);
    expect(result.annualMaintenanceEur).toBe(220);
  });

  test("combined package includes PV cost via pvCapacity basis", () => {
    const details = makeArchetypeDetails(100);
    const result = computePackageCost("combined", details);

    // PV sizing: floorArea * 0.045 = 4.5 kWp, clamped to min 3 = 4.5 kWp
    // PV capex: 1_500 * 4.5 = 6_750
    // envelope: 22_000
    // heat-pump: 22_000
    // Total capex = 22_000 + 22_000 + 6_750 = 50_750
    expect(result.capexEur).toBe(50_750);
    expect(result.annualMaintenanceEur).toBe(300 + 4.5 * 25);
  });

  test("null floor area throws when floorArea basis is required", () => {
    const details = makeArchetypeDetails(null as unknown as number);
    expect(() => computePackageCost("envelope", details)).toThrow(
      RSEPackageCatalogError,
    );
  });

  test("zero floor area throws when floorArea basis is required", () => {
    const details = makeArchetypeDetails(0);
    expect(() => computePackageCost("envelope", details)).toThrow(
      RSEPackageCatalogError,
    );
  });

  test("negative floor area throws when floorArea basis is required", () => {
    const details = makeArchetypeDetails(-10);
    expect(() => computePackageCost("envelope", details)).toThrow(
      RSEPackageCatalogError,
    );
  });

  test("no MVP measure uses surfaceArea cost basis", () => {
    const assumptions = Object.values(RSE_MVP_MEASURE_COST_ASSUMPTIONS);

    const surfaceAreaUsages = assumptions.filter(
      (a: { capex: { kind: string }; annualMaintenance: { kind: string } }) =>
        a.capex.kind === "eur_per_m2_surface_area" ||
        a.annualMaintenance.kind === "eur_per_m2_surface_area",
    );

    expect(surfaceAreaUsages).toHaveLength(0);
  });

  test("error includes typed reason consumed by downstream", () => {
    const details = makeArchetypeDetails(0);

    try {
      computePackageCost("envelope", details);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(RSEPackageCatalogError);
      expect((error as RSEPackageCatalogError).reason).toBe(
        "missing-floor-area",
      );
    }
  });
});
