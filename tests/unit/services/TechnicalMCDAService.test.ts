import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockRunTopsis } = vi.hoisted(() => ({
  mockRunTopsis: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  technical: { runTopsis: mockRunTopsis },
}));
import type {
  FinancialResults,
  RenovationScenario,
} from "../../../src/types/renovation";
import {
  buildMcdaTopsisRequest,
  createMcdaMinsMaxes,
  deriveTechnologyKpis,
  getRankingScenarioStatuses,
  hasCompleteHealthImpactData,
  mapPersonaToProfile,
  resolveNeutralizedKpiKeys,
  TechnicalMCDAService,
} from "../../../src/services/TechnicalMCDAService";

const baselineScenario: RenovationScenario = {
  id: "current",
  packageId: null,
  label: "Current Status",
  epcClass: "D",
  annualEnergyNeeds: 15000,
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
  heatingCoolingNeeds: 12000,
  heatingPrimaryEnergy: 10000,
  coolingPrimaryEnergy: 1500,
  flexibilityIndex: 50,
  comfortIndex: 72,
  avoidedThermalDalyPerPerson: 0.001,
  embodiedCarbonKgCo2e: 1200,
  measureIds: ["wall-insulation"],
  measures: ["Wall Insulation"],
};

const windowScenario: RenovationScenario = {
  id: "package-windows",
  packageId: "package-windows",
  label: "Window Replacement",
  epcClass: "C",
  annualEnergyNeeds: 11000,
  heatingCoolingNeeds: 11000,
  heatingPrimaryEnergy: 9200,
  coolingPrimaryEnergy: 1300,
  flexibilityIndex: 50,
  comfortIndex: 74,
  avoidedThermalDalyPerPerson: 0.002,
  embodiedCarbonKgCo2e: 1700,
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
  beforeEach(() => {
    mockRunTopsis.mockReset();
  });

  test("mapPersonaToProfile returns the Technical API profile string", () => {
    expect(mapPersonaToProfile("cost-optimization")).toBe(
      "Financially-Oriented",
    );
    expect(mapPersonaToProfile("health-oriented")).toBe("Health-Oriented");
  });

  test("deriveTechnologyKpis uses normalized frontend scenario data", () => {
    const technology = deriveTechnologyKpis(windowScenario, windowFinancial);

    expect(technology).toMatchObject({
      name: "package-windows",
      envelope_kpi: 11000,
      window_kpi: 0,
      heating_system_kpi: 9200,
      cooling_system_kpi: 1300,
      embodied_carbon_kpi: 1700,
      gwp_kpi: 0,
      daly_kpi: 0.002,
      ii_kpi: 9000,
      aoc_kpi: 250,
      irr_kpi: 0.1,
      npv_kpi: 7000,
      pp_kpi: 8,
      arv_kpi: 225000,
    });
  });

  test("createMcdaMinsMaxes neutralizes unavailable KPI ranges", () => {
    // These scenarios carry no operational emissions, so lifetime carbon is
    // unavailable and gwp_kpi is neutralized for the run.
    const scenarios = [wallScenario, windowScenario];
    const minsMaxes = createMcdaMinsMaxes(
      [
        deriveTechnologyKpis(wallScenario, wallFinancial),
        deriveTechnologyKpis(windowScenario, windowFinancial),
      ],
      resolveNeutralizedKpiKeys(scenarios, {
        [wallScenario.id]: wallFinancial,
        [windowScenario.id]: windowFinancial,
      }),
    );

    expect(minsMaxes.window_kpi).toEqual([-1, 1]);
    expect(minsMaxes.gwp_kpi).toEqual([-1, 1]);
    expect(minsMaxes.embodied_carbon_kpi).toEqual([1200, 1700]);
    expect(minsMaxes.heating_system_kpi).toEqual([9200, 10000]);
  });

  test("createMcdaMinsMaxes uses real min/max for daly_kpi", () => {
    const minsMaxes = createMcdaMinsMaxes(
      [
        deriveTechnologyKpis(wallScenario, wallFinancial),
        deriveTechnologyKpis(windowScenario, windowFinancial),
      ],
      [],
    );

    expect(minsMaxes.daly_kpi).toEqual([0.001, 0.002]);
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

  test("buildMcdaTopsisRequest excludes scenarios without embodied carbon", () => {
    // Sending 0 for a missing figure would rank the scenario best; see the
    // exclusion guard in TechnicalMCDAService.ts.
    const withoutCarbon: RenovationScenario = { ...wallScenario };
    delete withoutCarbon.embodiedCarbonKgCo2e;

    const request = buildMcdaTopsisRequest(
      [baselineScenario, withoutCarbon, windowScenario],
      {
        [wallScenario.id]: wallFinancial,
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

  test("getRankingScenarioStatuses excludes scenarios without DALY data", () => {
    const withoutDaly = { ...wallScenario };
    delete withoutDaly.avoidedThermalDalyPerPerson;

    expect(
      getRankingScenarioStatuses([withoutDaly], {
        [withoutDaly.id]: wallFinancial,
      }),
    ).toEqual([
      expect.objectContaining({
        eligible: false,
        reason: "Health impact data is missing",
      }),
    ]);
  });

  test("rejects the whole ranking when any package lacks DALY data", async () => {
    const withoutDaly = { ...wallScenario };
    delete withoutDaly.avoidedThermalDalyPerPerson;

    expect(hasCompleteHealthImpactData([withoutDaly, windowScenario])).toBe(
      false,
    );

    await expect(
      new TechnicalMCDAService().rank(
        [baselineScenario, withoutDaly, windowScenario],
        {
          [withoutDaly.id]: wallFinancial,
          [windowScenario.id]: windowFinancial,
        },
        "health-oriented",
      ),
    ).rejects.toThrow("requires health impact data");
    expect(mockRunTopsis).not.toHaveBeenCalled();
  });

  test("ranks normally when every package has DALY data", async () => {
    mockRunTopsis.mockResolvedValue({
      profile: "Health-Oriented",
      count: 2,
      ranking: [
        {
          name: windowScenario.id,
          closeness: 0.75,
          S_plus: 0.25,
          S_minus: 0.75,
        },
        {
          name: wallScenario.id,
          closeness: 0.25,
          S_plus: 0.75,
          S_minus: 0.25,
        },
      ],
    });

    const ranking = await new TechnicalMCDAService().rank(
      [baselineScenario, wallScenario, windowScenario],
      {
        [wallScenario.id]: wallFinancial,
        [windowScenario.id]: windowFinancial,
      },
      "health-oriented",
    );

    expect(mockRunTopsis).toHaveBeenCalledOnce();
    expect(ranking.map((item) => item.scenarioId)).toEqual([
      windowScenario.id,
      wallScenario.id,
    ]);
  });

  // The audited HRA run (Italy SFH 1946-1969, 125 m², 20-year lifetime) whose
  // ranking the shared carbon scale was verified against.
  const auditedPackages = [
    { id: "package-windows", embodied: 3405.6, annualTon: 15.218166 },
    { id: "package-floor-insulation", embodied: 864, annualTon: 15.088818 },
    {
      id: "package-wall-insulation-roof-insulation-windows-floor-insulation",
      embodied: 6835.77680672269,
      annualTon: 4.973622,
    },
  ];

  const auditedScenarios = (): RenovationScenario[] =>
    auditedPackages.map((pkg) => ({
      ...wallScenario,
      id: pkg.id,
      packageId: pkg.id,
      embodiedCarbonKgCo2e: pkg.embodied,
      annualEmissionsTonCo2e: pkg.annualTon,
    }));

  const auditedFinancials: Record<string, FinancialResults> =
    Object.fromEntries(auditedPackages.map((pkg) => [pkg.id, wallFinancial]));

  test("buildMcdaTopsisRequest shares one carbon scale between material and lifetime carbon", () => {
    const request = buildMcdaTopsisRequest(
      [baselineScenario, ...auditedScenarios()],
      auditedFinancials,
      "environmentally-conscious",
    );

    expect(
      request.technologies.map((technology) => technology.gwp_kpi),
    ).toEqual([307768.92, 302640.36, 106308.21680672267]);
    // Material carbon is a component of lifetime carbon, so normalizing them
    // independently would hide that it is a few percent of the total.
    expect(request.mins_maxes.gwp_kpi).toEqual([0, 307768.92]);
    expect(request.mins_maxes.embodied_carbon_kpi).toEqual([0, 307768.92]);
  });

  test("missing operational emissions neutralize lifetime carbon rather than emptying the ranking", () => {
    const scenarios = auditedScenarios();
    delete scenarios[1].annualEmissionsTonCo2e;

    const statuses = getRankingScenarioStatuses(scenarios, auditedFinancials);
    expect(statuses.map((status) => status.eligible)).toEqual([
      true,
      true,
      true,
    ]);

    const request = buildMcdaTopsisRequest(
      [baselineScenario, ...scenarios],
      auditedFinancials,
      "environmentally-conscious",
    );

    expect(request.technologies).toHaveLength(3);
    expect(request.mins_maxes.gwp_kpi).toEqual([-1, 1]);
    expect(request.mins_maxes.embodied_carbon_kpi).toEqual([
      864, 6835.77680672269,
    ]);
  });
});
