import { beforeEach, describe, expect, test, vi } from "vitest";

import { PortfolioAnalysisService } from "../../../../src/features/portfolio-advisor/services/PortfolioAnalysisService";
import type { PRABuilding } from "../../../../src/features/portfolio-advisor/context/types";
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
  loan: { percentage: 0, duration: 0, interestRate: 0 },
  incentives: {
    upfrontPercentage: 0,
    lifetimeAmount: 0,
    lifetimeYears: 0,
  },
};

function createBuilding(overrides?: Partial<PRABuilding>): PRABuilding {
  return {
    id: "building-1",
    name: "Building 1",
    source: "manual",
    category: "SFH",
    country: "Greece",
    lat: 37.98,
    lng: 23.73,
    floorArea: 100,
    constructionPeriod: "1961-1980",
    numberOfFloors: 2,
    propertyType: "apartment",
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
    );
  });

  test("multiple system selections fail before scenario evaluation", async () => {
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

    expect(mockEvaluateScenarios).not.toHaveBeenCalled();
    expect(mockCalculateForAllScenarios).not.toHaveBeenCalled();
    expect(results["building-1"]).toMatchObject({
      status: "error",
    });
    expect(results["building-1"].error).toContain("at most one system upgrade");
  });

  test("unsupported-only selections fail before scenario evaluation", async () => {
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
