import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  BuildingInfo,
  EstimationResult,
  FundingOptions,
  PackageFinancialInputsById,
  RenovationScenario,
  ScenarioId,
} from "../../../src/types/renovation";

const { mockCalculateARV, mockAssessRisk } = vi.hoisted(() => ({
  mockCalculateARV: vi.fn(),
  mockAssessRisk: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  financial: {
    calculateARV: mockCalculateARV,
    assessRisk: mockAssessRisk,
  },
}));

import { FinancialService } from "../../../src/services/FinancialService";

const stubARVResponse = {
  price_per_sqm: 2000,
  total_price: 200000,
  floor_area: 100,
  energy_class: "\u0394",
  metadata: {},
};

const stubRiskResponse = {
  point_forecasts: {
    NPV: 5000,
    IRR: 0.057,
    ROI: 0.25,
    PBP: 8,
    DPP: 10,
    MonthlyAvgSavings: 50,
    SuccessRate: 0.85,
  },
  metadata: {
    n_sims: 10000,
    project_lifetime: 20,
    capex: 10000,
    loan_amount: 0,
  },
  probabilities: null,
  percentiles: null,
  visualizations: null,
};

const mockBuilding = {
  country: "Greece",
  lat: 37.98,
  lng: 23.73,
  buildingType: "apartment",
  constructionPeriod: "1961-1980",
  floorArea: 100,
  numberOfFloors: 2,
  isModified: false,
  projectLifetime: 20,
  renovatedLast5Years: true,
  constructionYear: 1970,
  floorNumber: null,
  numberOfOpenings: null,
  climateZone: "",
  heatingTechnology: "",
  coolingTechnology: "",
  hotWaterTechnology: "",
  glazingTechnology: "",
} as BuildingInfo;

const mockEstimation = {
  estimatedEPC: "D",
  annualEnergyNeeds: 15000,
  annualEnergyCost: 3750,
  heatingCoolingNeeds: 15000,
  heatingDemand: 10000,
  coolingDemand: 5000,
  flexibilityIndex: 50,
  comfortIndex: 70,
  annualEnergyConsumption: 15000,
  deliveredTotal: 11000,
  deliveredEnergyCost: 2750,
  primaryEnergy: 16500,
  archetypeFloorArea: 100,
} as EstimationResult;

const mockFundingOptions: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0, interestRate: 0 },
  incentives: {
    upfrontPercentage: 0,
    lifetimeAmount: 0,
    lifetimeYears: 0,
  },
};

const renovatedScenario = {
  id: "renovated" as ScenarioId,
  packageId: "renovated",
  label: "After Renovation",
  epcClass: "B",
  annualEnergyNeeds: 5000,
  annualEnergyCost: 1250,
  heatingCoolingNeeds: 5000,
  deliveredTotal: 7000,
  deliveredEnergyCost: 1750,
  primaryEnergy: 9600,
  flexibilityIndex: 55,
  comfortIndex: 75,
  measureIds: ["wall-insulation"],
  measures: ["Wall Insulation"],
} as RenovationScenario;

const secondScenario = {
  ...renovatedScenario,
  id: "package-windows" as ScenarioId,
  packageId: "package-windows",
  label: "Window Replacement",
  annualEnergyNeeds: 4000,
  annualEnergyCost: 1000,
  heatingCoolingNeeds: 4000,
  deliveredTotal: 6500,
  deliveredEnergyCost: 1625,
  primaryEnergy: 9100,
  measureIds: ["windows"],
  measures: ["Window Replacement"],
} as RenovationScenario;

const packageFinancialInputs: PackageFinancialInputsById = {
  renovated: {
    capex: 10000,
    annualMaintenanceCost: 300,
  },
  "package-windows": {
    capex: 18000,
    annualMaintenanceCost: 450,
  },
};

describe("FinancialService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateARV.mockResolvedValue(stubARVResponse);
    mockAssessRisk.mockResolvedValue(stubRiskResponse);
  });

  test("ARV request includes Greek EPC class for renovated scenario", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({ energy_class: "\u0392" }),
    );
  });

  test("ARV request includes location and area", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 37.98,
        lng: 23.73,
        floor_area: 100,
        construction_year: 1970,
      }),
    );
  });

  test("risk assessment savings = max(0, round(baseline - renovated))", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({ annual_energy_savings: 10000 }),
    );
  });

  test("finance keeps thermal-needs savings while delivered-energy gate is disabled", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({ annual_energy_savings: 10000 }),
    );
  });

  test("negative savings clamped to 0 and risk assessment skipped", async () => {
    const service = new FinancialService();

    const highEnergyScenario: RenovationScenario = {
      ...renovatedScenario,
      annualEnergyNeeds: 20000,
    };

    const results = await service.calculateForAllScenarios(
      [highEnergyScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      {
        renovated: {
          capex: 10000,
          annualMaintenanceCost: 300,
        },
      },
      mockBuilding,
    );

    expect(mockAssessRisk).not.toHaveBeenCalled();
    expect(results["renovated"].riskAssessment).toBeNull();
  });

  test("output level matches constructor argument", async () => {
    const service = new FinancialService("professional");

    await service.calculateForAllScenarios(
      [renovatedScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({ output_level: "professional" }),
    );
  });

  test("uses package-specific CAPEX and maintenance values for each scenario", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario, secondScenario],
      mockFundingOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        capex: 10000,
        annual_maintenance_cost: 300,
      }),
    );
    expect(mockAssessRisk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        capex: 18000,
        annual_maintenance_cost: 450,
      }),
    );
  });

  test("applies loan amounts per scenario package", async () => {
    const service = new FinancialService();
    const fundedOptions: FundingOptions = {
      financingType: "loan",
      loan: { percentage: 50, duration: 12, interestRate: 0.04 },
      incentives: {
        upfrontPercentage: 0,
        lifetimeAmount: 0,
        lifetimeYears: 0,
      },
    };

    await service.calculateForAllScenarios(
      [renovatedScenario, secondScenario],
      fundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        capex: 10000,
        loan_amount: 5000,
      }),
    );
    expect(mockAssessRisk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        capex: 18000,
        loan_amount: 9000,
      }),
    );
  });

  test("forwards incentive fields and sanitizes invalid lifetime incentives", async () => {
    const service = new FinancialService();
    const fundedOptions: FundingOptions = {
      financingType: "loan",
      loan: { percentage: 50, duration: 12, interestRate: 0.04 },
      incentives: {
        upfrontPercentage: 20,
        lifetimeAmount: 1200,
        lifetimeYears: 0,
      },
    };

    await service.calculateForAllScenarios(
      [renovatedScenario],
      fundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        capex: 10000,
        loan_amount: 4000,
        upfront_incentive_percentage: 20,
        lifetime_incentive_amount: 0,
        lifetime_incentive_years: 0,
      }),
    );
  });

  test("clamps lifetime incentive duration to project lifetime", async () => {
    const service = new FinancialService();
    const fundedOptions: FundingOptions = {
      financingType: "self-funded",
      loan: { percentage: 0, duration: 0, interestRate: 0 },
      incentives: {
        upfrontPercentage: 0,
        lifetimeAmount: 900,
        lifetimeYears: 30,
      },
    };

    await service.calculateForAllScenarios(
      [renovatedScenario],
      fundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        lifetime_incentive_amount: 900,
        lifetime_incentive_years: 20,
      }),
    );
  });
});
