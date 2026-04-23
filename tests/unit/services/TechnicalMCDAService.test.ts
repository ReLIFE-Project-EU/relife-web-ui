import { describe, expect, test } from "vitest";
import type {
  FinancialResults,
  RenovationScenario,
} from "../../../src/types/renovation";
import {
  buildMcdaTopsisRequest,
  createMcdaMinsMaxes,
  deriveTechnologyKpis,
  getRankingScenarioStatuses,
  mapPersonaToProfile,
} from "../../../src/services/TechnicalMCDAService";

const baselineScenario: RenovationScenario = {
  id: "current",
  packageId: null,
  label: "Current Status",
  epcClass: "D",
  annualEnergyNeeds: 15000,
  annualEnergyCost: 3750,
  heatingCoolingNeeds: 15000,
  flexibilityIndex: 50,
  comfortIndex: 70,
  measureIds: [],
  measures: [],
};

const wallScenario: RenovationScenario = {
  id: "package-wall-insulation",
  packageId: "package-wall-insulation",
  label: "Wall Insulation",
  epcClass: "C",
  annualEnergyNeeds: 12000,
  annualEnergyCost: 3000,
  heatingCoolingNeeds: 12000,
  heatingPrimaryEnergy: 10000,
  coolingPrimaryEnergy: 1500,
  flexibilityIndex: 50,
  comfortIndex: 72,
  measureIds: ["wall-insulation"],
  measures: ["Wall Insulation"],
};

const windowScenario: RenovationScenario = {
  id: "package-windows",
  packageId: "package-windows",
  label: "Window Replacement",
  epcClass: "C",
  annualEnergyNeeds: 11000,
  annualEnergyCost: 2750,
  heatingCoolingNeeds: 11000,
  heatingPrimaryEnergy: 9200,
  coolingPrimaryEnergy: 1300,
  flexibilityIndex: 50,
  comfortIndex: 74,
  measureIds: ["windows"],
  measures: ["Window Replacement"],
};

const wallFinancial: FinancialResults = {
  arv: null,
  riskAssessment: {
    pointForecasts: {
      NPV: 5000,
      IRR: 0.08,
      ROI: 0.2,
      PBP: 10,
      DPP: 12,
      MonthlyAvgSavings: 45,
      SuccessRate: 0.8,
    },
    metadata: {
      project_lifetime: 20,
      capex: 12000,
      loan_amount: 0,
      output_level: "private",
    },
  },
  capitalExpenditure: 12000,
  annualMaintenanceCost: 300,
  returnOnInvestment: 0.2,
  paybackTime: 10,
  netPresentValue: 5000,
  afterRenovationValue: 220000,
};

const windowFinancial: FinancialResults = {
  ...wallFinancial,
  capitalExpenditure: 9000,
  annualMaintenanceCost: 250,
  paybackTime: 8,
  netPresentValue: 7000,
  afterRenovationValue: 225000,
  riskAssessment: {
    ...wallFinancial.riskAssessment!,
    pointForecasts: {
      ...wallFinancial.riskAssessment!.pointForecasts,
      NPV: 7000,
      IRR: 0.1,
      PBP: 8,
    },
    metadata: {
      ...wallFinancial.riskAssessment!.metadata,
      capex: 9000,
    },
  },
};

describe("TechnicalMCDAService helpers", () => {
  test("mapPersonaToProfile returns the Technical API profile string", () => {
    expect(mapPersonaToProfile("cost-optimization")).toBe(
      "Financially-Oriented",
    );
    expect(mapPersonaToProfile("comfort-driven")).toBe("Comfort-Oriented");
  });

  test("deriveTechnologyKpis uses normalized frontend scenario data", () => {
    const technology = deriveTechnologyKpis(windowScenario, windowFinancial);

    expect(technology).toMatchObject({
      name: "package-windows",
      envelope_kpi: 11000,
      window_kpi: 0,
      heating_system_kpi: 9200,
      cooling_system_kpi: 1300,
      ii_kpi: 9000,
      aoc_kpi: 250,
      irr_kpi: 0.1,
      npv_kpi: 7000,
      pp_kpi: 8,
      arv_kpi: 225000,
    });
  });

  test("createMcdaMinsMaxes neutralizes unavailable KPI ranges", () => {
    const minsMaxes = createMcdaMinsMaxes([
      deriveTechnologyKpis(wallScenario, wallFinancial),
      deriveTechnologyKpis(windowScenario, windowFinancial),
    ]);

    expect(minsMaxes.window_kpi).toEqual([-1, 1]);
    expect(minsMaxes.thermal_comfort_air_temp_kpi).toEqual([-1, 1]);
    expect(minsMaxes.heating_system_kpi).toEqual([9200, 10000]);
  });

  test("buildMcdaTopsisRequest assembles technologies from normalized scenarios", () => {
    const request = buildMcdaTopsisRequest(
      [baselineScenario, wallScenario, windowScenario],
      {
        [wallScenario.id]: wallFinancial,
        [windowScenario.id]: windowFinancial,
      },
      "environmentally-conscious",
    );

    expect(request.profile).toBe("Environment-Oriented");
    expect(request.technologies.map((technology) => technology.name)).toEqual([
      "package-wall-insulation",
      "package-windows",
    ]);
    expect(request.mins_maxes.envelope_kpi[0]).toBeLessThan(
      request.mins_maxes.envelope_kpi[1],
    );
  });

  test("buildMcdaTopsisRequest excludes scenarios without risk assessment", () => {
    const request = buildMcdaTopsisRequest(
      [baselineScenario, wallScenario, windowScenario],
      {
        [wallScenario.id]: {
          ...wallFinancial,
          riskAssessment: null,
        },
        [windowScenario.id]: windowFinancial,
      },
      "environmentally-conscious",
    );

    expect(request.technologies.map((technology) => technology.name)).toEqual([
      "package-windows",
    ]);
  });

  test("getRankingScenarioStatuses explains missing ranking inputs", () => {
    const heatPumpScenario: RenovationScenario = {
      ...wallScenario,
      id: "package-air-water-heat-pump",
      packageId: "package-air-water-heat-pump",
      label: "Air-Water Heat Pump",
      measureIds: ["air-water-heat-pump"],
      measures: ["Air-Water Heat Pump"],
    };
    const completePvScenario: RenovationScenario = {
      ...wallScenario,
      id: "package-pv",
      packageId: "package-pv",
      label: "PV Panels",
      measureIds: ["pv"],
      measures: ["PV Panels"],
      pvGeneration: 4000,
      pvSelfConsumption: 2600,
      pvGridExport: 1400,
      pvSelfSufficiencyRate: 0.35,
    };
    const pvScenario: RenovationScenario = {
      ...wallScenario,
      id: "package-wall-insulation-pv",
      packageId: "package-wall-insulation-pv",
      label: "Wall Insulation + PV",
      measureIds: ["wall-insulation", "pv"],
      measures: ["Wall Insulation", "PV"],
    };

    const statuses = getRankingScenarioStatuses(
      [
        wallScenario,
        heatPumpScenario,
        completePvScenario,
        pvScenario,
        windowScenario,
      ],
      {
        [wallScenario.id]: wallFinancial,
        [heatPumpScenario.id]: wallFinancial,
        [completePvScenario.id]: wallFinancial,
        [pvScenario.id]: wallFinancial,
        [windowScenario.id]: {
          ...windowFinancial,
          riskAssessment: null,
        },
      },
    );

    expect(statuses).toEqual([
      expect.objectContaining({ scenario: wallScenario, eligible: true }),
      expect.objectContaining({
        scenario: heatPumpScenario,
        eligible: true,
      }),
      expect.objectContaining({
        scenario: completePvScenario,
        eligible: true,
      }),
      expect.objectContaining({
        scenario: pvScenario,
        eligible: false,
        reason: "Solar panel data is incomplete",
      }),
      expect.objectContaining({
        scenario: windowScenario,
        eligible: false,
        reason: "No energy savings calculated",
      }),
    ]);
  });

  test("deriveTechnologyKpis maps PV ranking inputs", () => {
    const pvScenario: RenovationScenario = {
      ...wallScenario,
      id: "package-wall-insulation-pv",
      packageId: "package-wall-insulation-pv",
      label: "Wall Insulation + PV",
      measureIds: ["wall-insulation", "pv"],
      measures: ["Wall Insulation", "PV"],
      pvGeneration: 4000,
      pvSelfConsumption: 2600,
      pvGridExport: 1400,
      pvSelfSufficiencyRate: 0.35,
      pvSelfConsumptionRate: 0.65,
    };

    const technology = deriveTechnologyKpis(pvScenario, wallFinancial);

    expect(technology.onsite_res_kpi).toBe(35);
    expect(technology.net_energy_export_kpi).toBe(1400);
  });
});
