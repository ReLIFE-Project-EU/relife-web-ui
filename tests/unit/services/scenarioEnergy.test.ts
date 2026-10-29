import { describe, expect, test } from "vitest";

import {
  reduceEcmRun,
  splitCarriers,
  type ScenarioEnergy,
} from "../../../src/services/scenarioEnergy";
import type { SimulatedBuilding } from "../../../src/services/simulatedBuilding";
import type { BuildingPayload } from "../../../src/types/archetype";
import type {
  ECMScenario,
  UNI11300Results,
} from "../../../src/types/forecasting";

const HOURS_PER_YEAR = 8760;

function simulated(modeledFloorArea: number): SimulatedBuilding {
  return {
    archetype: { category: "SFH", country: "Greece", name: "GR_SFH" },
    bui: { building: { net_floor_area: 100 } } as unknown as BuildingPayload,
    modeledFloorArea,
  };
}

/** 100 Wh of heating every hour: 876 kWh/year of thermal need. */
function run(results: Partial<ECMScenario["results"]>): ECMScenario {
  return {
    results: {
      hourly_building: { Q_HC: Array(HOURS_PER_YEAR).fill(100) },
      ...results,
    },
  } as ECMScenario;
}

const gasBoiler: UNI11300Results = {
  summary: {
    E_delivered_thermal_kWh: 1600,
    E_delivered_electric_total_kWh: 400,
    EP_heat_total_kWh: 1900,
    EP_total_kWh: 2600,
  },
};

describe("reduceEcmRun", () => {
  test.each<[string, ECMScenario, number, Partial<ScenarioEnergy>]>([
    [
      "plain baseline",
      run({
        hourly_building: {
          Q_HC: Array(HOURS_PER_YEAR).fill(100),
          T_op: Array(HOURS_PER_YEAR).fill(22),
        },
        primary_energy_uni11300: gasBoiler,
      }),
      100,
      {
        thermalNeed: 876,
        heatingNeed: 876,
        coolingNeed: 0,
        deliveredTotal: 2000,
        carrierBreakdown: { naturalGasKwh: 1600, gridElectricityKwh: 400 },
        primaryEnergy: 2600,
        heatingPrimaryEnergy: 1900,
        comfortBandIndex: 100,
        dailyMeanOperativeTemperatures: Array(365).fill(22),
      },
    ],
    [
      "flat share halves every figure",
      run({ primary_energy_uni11300: gasBoiler }),
      50,
      {
        thermalNeed: 438,
        deliveredTotal: 1000,
        carrierBreakdown: { naturalGasKwh: 800, gridElectricityKwh: 200 },
        primaryEnergy: 1300,
        dailyMeanOperativeTemperatures: undefined,
      },
    ],
    [
      "heat pump moves heating to grid electricity",
      run({
        primary_energy_uni11300: {
          heat_pump_applied: true,
          summary: {
            E_delivered_thermal_kWh: 5000,
            E_delivered_electric_total_kWh: 850,
            EP_total_kWh: 1200,
            heat_pump_cop: 3.2,
          },
        },
      }),
      100,
      {
        deliveredTotal: 850,
        carrierBreakdown: { naturalGasKwh: 0, gridElectricityKwh: 850 },
        heatPumpCop: 3.2,
      },
    ],
    [
      "PV self-consumption leaves grid import only",
      run({
        primary_energy_uni11300: {
          summary: {
            E_delivered_thermal_kWh: 1500,
            E_delivered_electric_total_kWh: 500,
            EP_total_kWh: 3000,
          },
        },
        pv_hp: {
          summary: {
            annual_kwh: {
              pv_generation: 2200,
              self_consumption: 300,
              grid_export: 1900,
            },
            indicators: { self_consumption_rate: 0.14 },
          },
        },
      }),
      100,
      {
        deliveredTotal: 1700,
        carrierBreakdown: { naturalGasKwh: 1500, gridElectricityKwh: 200 },
        pvGeneration: 2200,
        pvSelfConsumption: 300,
        pvGridExport: 1900,
        pvSelfConsumptionRate: 0.14,
      },
    ],
    [
      "missing primary energy keeps delivered energy from the carriers",
      run({
        primary_energy_uni11300: {
          summary: {
            E_delivered_thermal_kWh: 1600,
            E_delivered_electric_total_kWh: 400,
          },
        },
      }),
      100,
      { deliveredTotal: 2000, primaryEnergy: undefined },
    ],
  ])("%s", (_, ecmRun, modeledFloorArea, expected) => {
    expect(reduceEcmRun(ecmRun, simulated(modeledFloorArea))).toMatchObject(
      expected,
    );
  });
});

describe("splitCarriers", () => {
  test.each<[string, UNI11300Results | undefined, number, unknown]>([
    [
      "gas boiler",
      gasBoiler,
      0,
      { naturalGasKwh: 1600, gridElectricityKwh: 400 },
    ],
    [
      "heat pump zeroes gas",
      {
        heat_pump_applied: true,
        summary: {
          E_delivered_thermal_kWh: 5000,
          E_delivered_electric_total_kWh: 900,
        },
      },
      0,
      { naturalGasKwh: 0, gridElectricityKwh: 900 },
    ],
    [
      "electric total falls back to heat plus cool",
      {
        summary: {
          E_delivered_thermal_kWh: 800,
          E_delivered_electric_heat_kWh: 300,
          E_delivered_electric_cool_kWh: 100,
        },
      },
      0,
      { naturalGasKwh: 800, gridElectricityKwh: 400 },
    ],
    [
      "PV self-consumption reduces grid import",
      gasBoiler,
      300,
      { naturalGasKwh: 1600, gridElectricityKwh: 100 },
    ],
    ["no summary", undefined, 0, undefined],
  ])("%s", (_, uniResults, pvSelfConsumptionKwh, expected) => {
    expect(splitCarriers(uniResults, pvSelfConsumptionKwh)).toEqual(expected);
  });
});
