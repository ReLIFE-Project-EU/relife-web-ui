import { expect, test, vi } from "vitest";
import type { ArchetypeInfo } from "../../../../src/types/forecasting";
import type {
  ArchetypeDetails,
  BuildingPayload,
} from "../../../../src/types/archetype";
import { ArchetypeMatchStrategy } from "../../../../src/services/archetypeMatching";
import { BUILDING_CASES } from "../../../../src/features/calibration/referenceCases";
import {
  runCalibration,
  type CalibrationServices,
  type CalibrationUpdate,
} from "../../../../src/features/calibration/services/calibrationService";
import type { ScenarioEnergy } from "../../../../src/services/scenarioEnergy";

function services() {
  return {
    building: {
      getArchetypes: vi.fn(async () => BUILDING_CASES),
      // Calibration orchestration only reads these building summary fields.
      getArchetypeDetails: vi.fn(
        async (reference: ArchetypeInfo) =>
          ({
            ...reference,
            floorArea: 250,
            numberOfFloors: 2,
            location: { lat: 45, lng: 12 },
          }) as ArchetypeDetails,
      ),
    },
    energy: {
      estimateEPC: vi.fn(async () => ({
        baseline: {
          thermalNeed: 11000,
          heatingNeed: 10000,
          coolingNeed: 1000,
          deliveredTotal: 12000,
          primaryEnergy: 15000,
        } as ScenarioEnergy,
        flexibilityIndex: 50,
        comfortIndex: 50,
        simulated: {
          archetype: { category: "SFH", country: "Italy", name: "IT_SFH" },
          bui: {
            building: { net_floor_area: 250 },
          } as unknown as BuildingPayload,
          modeledFloorArea: 250,
        },
        matchStrategy: ArchetypeMatchStrategy.USER_SELECTED,
      })),
    },
    financial: {
      estimatePackageCosts: vi.fn(async () => ({
        capex: 6125,
        annualMaintenanceCost: 0,
        capexFromLookup: true,
        opexFromLookup: true,
      })),
    },
  } satisfies CalibrationServices;
}

test("runs the selected cost and energy checks using reference inputs", async () => {
  const mocks = services();
  const events: CalibrationUpdate[] = [];
  await runCalibration((event) => events.push(event), mocks);
  expect(mocks.financial.estimatePackageCosts).toHaveBeenCalledTimes(21);
  expect(mocks.energy.estimateEPC).toHaveBeenCalledTimes(6);
  expect(mocks.energy.estimateEPC).toHaveBeenCalledWith(
    expect.objectContaining({ floorArea: 250, lat: 45, lng: 12 }),
  );
  expect(events).toContainEqual({
    kind: "cost",
    id: "Austria:wall-insulation",
    state: { status: "success", value: { capex: 6125, euroPerM2: 61.25 } },
  });
  expect(events).toContainEqual({
    kind: "energy",
    id: BUILDING_CASES[0].name,
    state: {
      status: "success",
      value: { heating: 40, cooling: 4, delivered: 48, primary: 60 },
    },
  });
});

test("a failed simulation retains its source inputs and other results", async () => {
  const mocks = services();
  mocks.energy.estimateEPC.mockRejectedValueOnce(
    new Error("Simulation unavailable"),
  );
  const events: CalibrationUpdate[] = [];
  await runCalibration((event) => events.push(event), mocks);
  expect(events).toContainEqual({
    kind: "energy",
    id: BUILDING_CASES[0].name,
    state: { status: "error", message: "Simulation unavailable" },
  });
  expect(events).toContainEqual(
    expect.objectContaining({
      kind: "building",
      id: BUILDING_CASES[0].name,
      state: expect.objectContaining({ status: "success" }),
    }),
  );
  expect(
    events.filter(
      (event) => event.kind === "energy" && event.state.status === "success",
    ),
  ).toHaveLength(5);
});
