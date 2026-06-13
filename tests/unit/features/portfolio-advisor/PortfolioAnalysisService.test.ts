import { beforeEach, describe, expect, test, vi } from "vitest";

import { PortfolioAnalysisService } from "../../../../src/features/portfolio-advisor/services/PortfolioAnalysisService";
import { ENERGY_TARIFF_DEFAULTS } from "../../../../src/services/carrierSavingsService";
import {
  initialState,
  portfolioAdvisorReducer,
} from "../../../../src/features/portfolio-advisor/context/portfolioAdvisorReducer";
import type {
  PortfolioAdvisorState,
  PRABuilding,
} from "../../../../src/features/portfolio-advisor/context/types";
import type {
  IEnergyService,
  IFinancialService,
  IRenovationService,
} from "../../../../src/services/types";
import type {
  EstimationResult,
  FinancialResults,
  FundingOptions,
  RenovationMeasureId,
  RenovationScenario,
} from "../../../../src/types/renovation";

const estimation: EstimationResult = {
  estimatedEPC: "D",
  annualEnergyNeeds: 15000,
  annualEnergyCost: 3750,
  heatingCoolingNeeds: 15000,
  heatingDemand: 10000,
  coolingDemand: 5000,
  flexibilityIndex: 50,
  comfortIndex: 70,
  annualEnergyConsumption: 15000,
  archetypeFloorArea: 100,
};

const scenarios: RenovationScenario[] = [
  {
    id: "current",
    packageId: null,
    label: "Current Status",
    epcClass: "D",
    annualEnergyNeeds: 15000,
    annualEnergyCost: 3750,
    heatingCoolingNeeds: 15000,
    deliveredTotal: 11000,
    deliveredEnergyCost: 2750,
    primaryEnergy: 16500,
    flexibilityIndex: 50,
    comfortIndex: 70,
    measureIds: [],
    measures: [],
  },
  {
    id: "renovated",
    packageId: "renovated",
    label: "After Renovation",
    epcClass: "C",
    annualEnergyNeeds: 12000,
    annualEnergyCost: 3000,
    heatingCoolingNeeds: 12000,
    deliveredTotal: 9000,
    deliveredEnergyCost: 2250,
    primaryEnergy: 14000,
    flexibilityIndex: 50,
    comfortIndex: 72,
    measureIds: ["wall-insulation"],
    measures: ["Wall Insulation"],
  },
];

const financialResults: Record<string, FinancialResults> = {
  renovated: {
    arv: null,
    riskAssessment: null,
    capitalExpenditure: 10000,
    returnOnInvestment: 0,
    paybackTime: 0,
    netPresentValue: 0,
    afterRenovationValue: 200000,
  },
};

const funding: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0 },
  incentives: {
    upfrontPercentage: 0,
  },
};

const stateWithResults: PortfolioAdvisorState = {
  ...initialState,
  buildingResults: {
    "building-1": {
      buildingId: "building-1",
      status: "success",
      financialResults: {
        arv: null,
        riskAssessment: null,
        capitalExpenditure: 10_000,
        annualMaintenanceCost: 300,
        returnOnInvestment: 0.1,
        paybackTime: 10,
        netPresentValue: 1000,
        afterRenovationValue: null,
      },
    },
  },
  mcdaRanking: [{ scenarioId: "renovated", rank: 1, score: 1 }],
  analysisProgress: { completed: 1, total: 1 },
};

function createBuilding(overrides?: Partial<PRABuilding>): PRABuilding {
  return {
    id: "building-1",
    name: "Building 1",
    source: "manual",
    category: "Multi family House",
    country: "Greece",
    lat: 37.98,
    lng: 23.73,
    floorArea: 100,
    constructionPeriod: "1961-1980",
    numberOfFloors: 2,
    propertyType: "Multi family House",
    validationStatus: "valid",
    ...overrides,
  };
}

describe("PortfolioAnalysisService", () => {
  const mockEstimateEPC = vi.fn();
  const mockIsAnalysisEligibleMeasure = vi.fn();
  const mockEvaluateScenarios = vi.fn();
  const mockCalculateForAllScenarios = vi.fn();

  let service: PortfolioAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEstimateEPC.mockResolvedValue(estimation);
    mockIsAnalysisEligibleMeasure.mockImplementation(
      (measureId: RenovationMeasureId) =>
        [
          "wall-insulation",
          "roof-insulation",
          "windows",
          "floor-insulation",
          "condensing-boiler",
          "air-water-heat-pump",
          "pv",
        ].includes(measureId),
    );
    mockEvaluateScenarios.mockResolvedValue(scenarios);
    mockCalculateForAllScenarios.mockResolvedValue(financialResults);

    service = new PortfolioAnalysisService(
      {
        estimateEPC: mockEstimateEPC,
      } as unknown as IEnergyService,
      {
        isAnalysisEligibleMeasure: mockIsAnalysisEligibleMeasure,
        evaluateScenarios: mockEvaluateScenarios,
      } as unknown as IRenovationService,
      {
        calculateForAllScenarios: mockCalculateForAllScenarios,
      } as unknown as IFinancialService,
    );
  });

  test("system-only selections produce the PRA renovated scenario and reach finance", async () => {
    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["condensing-boiler"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).toHaveBeenCalledWith(
      expect.any(Object),
      estimation,
      [
        {
          id: "renovated",
          label: "After Renovation",
          measureIds: ["condensing-boiler"],
        },
      ],
      expect.anything(),
    );
    expect(mockCalculateForAllScenarios).toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "success",
      financialResults: financialResults.renovated,
    });
  });

  test("mixed selections keep both envelope and system measures in the PRA renovated scenario", async () => {
    await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["wall-insulation", "air-water-heat-pump"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).toHaveBeenCalledWith(
      expect.any(Object),
      estimation,
      [
        {
          id: "renovated",
          label: "After Renovation",
          measureIds: ["wall-insulation", "air-water-heat-pump"],
        },
      ],
      expect.anything(),
    );
  });

  test("passes financial assumptions through to the financial service", async () => {
    await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["wall-insulation"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
      financialAssumptions: { gasTariffEurPerKwh: 0.12 },
    });

    expect(mockCalculateForAllScenarios).toHaveBeenCalledWith(
      expect.objectContaining({
        financialAssumptions: { gasTariffEurPerKwh: 0.12 },
      }),
    );
  });

  test("multiple system selections normalize to heat pump before scenario evaluation", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["condensing-boiler", "air-water-heat-pump"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).toHaveBeenCalledWith(
      expect.any(Object),
      estimation,
      [
        {
          id: "renovated",
          label: "After Renovation",
          measureIds: ["air-water-heat-pump"],
        },
      ],
      expect.anything(),
    );
    expect(mockCalculateForAllScenarios).toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "success",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Dropping 'condensing-boiler' because it is mutually exclusive with 'air-water-heat-pump'",
    );

    warnSpy.mockRestore();
  });

  test("PV selections produce the PRA renovated scenario", async () => {
    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["pv"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).toHaveBeenCalledWith(
      expect.any(Object),
      estimation,
      [
        {
          id: "renovated",
          label: "After Renovation",
          measureIds: ["pv"],
        },
      ],
      expect.anything(),
    );
    expect(mockCalculateForAllScenarios).toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "success",
    });
  });

  test("copies professional chart metadata into PRA financial results", async () => {
    mockCalculateForAllScenarios.mockResolvedValue({
      renovated: {
        ...financialResults.renovated,
        riskAssessment: {
          pointForecasts: {
            NPV: 5000,
            IRR: 0.05,
            ROI: 0.2,
            PBP: 8,
            DPP: 10,
            MonthlyAvgSavings: 40,
            SuccessRate: 0.8,
          },
          metadata: {
            project_lifetime: 20,
            capex: 10000,
            output_level: "professional",
            chart_metadata: {
              NPV: {
                bins: {
                  centers: [-1000, 0, 1000],
                  counts: [2, 5, 3],
                  edges: [-1500, -500, 500, 1500],
                },
                statistics: {
                  mean: 100,
                  std: 250,
                  P10: -500,
                  P50: 100,
                  P90: 750,
                },
              },
            },
          },
          probabilities: {
            "Pr(NPV > 0)": 0.8,
          },
        },
      },
    });

    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["wall-insulation"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(results["building-1"].financialResults?.chartMetadata?.NPV).toEqual({
      bins: {
        centers: [-1000, 0, 1000],
        counts: [2, 5, 3],
        edges: [-1500, -500, 500, 1500],
      },
      statistics: {
        mean: 100,
        std: 250,
        P10: -500,
        P50: 100,
        P90: 750,
      },
    });
  });

  test("unsupported-only selections fail before scenario evaluation", async () => {
    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: ["solar-thermal"],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).not.toHaveBeenCalled();
    expect(mockCalculateForAllScenarios).not.toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "error",
    });
    expect(results["building-1"].error).toContain("analyzable measure");
  });

  test("empty selections fail before scenario evaluation", async () => {
    const results = await service.analyzePortfolio({
      buildings: [createBuilding()],
      selectedMeasures: [],
      financingScheme: "equity",
      funding,
      projectLifetime: 20,
      onProgress: vi.fn(),
      globalCapex: 12000,
      globalMaintenanceCost: 500,
    });

    expect(mockEvaluateScenarios).not.toHaveBeenCalled();
    expect(mockCalculateForAllScenarios).not.toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "error",
    });
    expect(results["building-1"].error).toContain(
      "selected renovation measure",
    );
  });
});

describe("portfolioAdvisorReducer", () => {
  test("initial state uses shared gas tariff default", () => {
    expect(initialState.gasTariffEurPerKwh).toBe(
      ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
    );
  });

  test("SET_GAS_TARIFF updates tariff and clears stale analysis results", () => {
    const state = portfolioAdvisorReducer(stateWithResults, {
      type: "SET_GAS_TARIFF",
      gasTariffEurPerKwh: 0.12,
    });

    expect(state.gasTariffEurPerKwh).toBe(0.12);
    expect(state.buildingResults).toEqual({});
    expect(state.mcdaRanking).toBeNull();
    expect(state.analysisProgress).toBeNull();
  });
});
