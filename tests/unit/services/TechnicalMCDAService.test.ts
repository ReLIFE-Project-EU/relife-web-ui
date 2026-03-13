import { describe, expect, test } from "vitest";
import type {
  FinancialResults,
  RenovationScenario,
} from "../../../src/types/renovation";
import {
  buildMcdaTopsisRequest,
  createMcdaMinsMaxes,
  deriveTechnologyKpis,
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
  returnOnInvestment: 0.2,
  paybackTime: 10,
  netPresentValue: 5000,
  afterRenovationValue: 220000,
};

const windowFinancial: FinancialResults = {
  ...wallFinancial,
  capitalExpenditure: 9000,
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
    const technology = deriveTechnologyKpis(
      windowScenario,
      windowFinancial,
      baselineScenario,
    );

    expect(technology).toMatchObject({
      name: "package-windows",
      envelope_kpi: expect.any(Number),
      window_kpi: expect.any(Number),
      ii_kpi: 9000,
      aoc_kpi: 2750,
      irr_kpi: 0.1,
      npv_kpi: 7000,
      pp_kpi: 8,
      arv_kpi: 225000,
    });
    expect(technology.window_kpi).toBeGreaterThan(0);
  });

  test("createMcdaMinsMaxes widens constant KPI ranges", () => {
    const minsMaxes = createMcdaMinsMaxes([
      {
        ...deriveTechnologyKpis(wallScenario, wallFinancial, baselineScenario),
        heating_system_kpi: 0,
      },
      {
        ...deriveTechnologyKpis(
          windowScenario,
          windowFinancial,
          baselineScenario,
        ),
        heating_system_kpi: 0,
      },
    ]);

    expect(minsMaxes.heating_system_kpi[0]).toBeLessThan(0);
    expect(minsMaxes.heating_system_kpi[1]).toBeGreaterThan(0);
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
});
