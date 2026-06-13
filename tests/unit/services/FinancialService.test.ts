import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  BuildingInfo,
  EstimationResult,
  FundingOptions,
  PackageFinancialInputsById,
  RenovationScenario,
  ScenarioId,
} from "../../../src/types/renovation";
import type { RiskAssessmentRequest } from "../../../src/types/financial";
import { APIError } from "../../../src/types/common";
import { FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH } from "../../../src/services/carrierSavingsService";

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
  after: {
    price_per_sqm: 2000,
    total_price: 200000,
    greek_epc_class: "Δ",
  },
  before: null,
  uplift: null,
  floor_area: 100,
  metadata: {},
};

/** A single scheme's result in the new multi-scheme wire shape. */
const schemeResultStub = {
  scheme_id: 1,
  scheme_family: "self_financed",
  summary: {
    percentiles: {
      NPV: { P5: -1000, P10: 1000, P50: 5000, P90: 9000, P95: 11000 },
      IRR: { P10: 0.03, P50: 0.057, P90: 0.09 },
      ROI: { P10: 0.1, P50: 0.25, P90: 0.4 },
      PBP: { P10: 6, P50: 8, P90: 12 },
      DPP: { P10: 7, P50: 10, P90: 14 },
    },
    probabilities: {
      "Pr(NPV > 0)": 0.85,
      "Pr(PBP < 20y)": 0.9,
      "Pr(DPP < 20y)": 0.8,
    },
    disc_target_used: 0.05,
    n_sims: 10000,
  },
  cashflow_distributions: {
    years: [0, 1, 2],
    cash_flows: { P50: [-10000, 300, 300] },
    inflows: { P50: [0, 500, 500] },
    outflows: { P50: [0, 200, 200] },
  },
  kpi_histograms: {
    NPV: {
      bin_edges: [-500, 500],
      feasible_counts: [1],
      infeasible_counts: [0],
      p10: 0,
      p50: 100,
      p90: 200,
      project_lifetime: null,
    },
  },
};

/** Build a wire response keyed by whatever scheme_type(s) the request sent. */
function wireResponseFor(request: RiskAssessmentRequest) {
  const results = Object.fromEntries(
    request.schemes.map((s) => [s.scheme_type, schemeResultStub]),
  );
  return {
    results,
    metadata: {
      capex: request.capex,
      project_lifetime: request.project_lifetime,
      n_schemes: request.schemes.length,
    },
  };
}

const mockBuilding = {
  country: "Greece",
  lat: 37.98,
  lng: 23.73,
  buildingType: "Single Family House",
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
  heatingCoolingNeeds: 15000,
  heatingDemand: 10000,
  coolingDemand: 5000,
  flexibilityIndex: 50,
  comfortIndex: 70,
  annualEnergyConsumption: 15000,
  deliveredTotal: 11000,
  carrierBreakdown: { naturalGasKwh: 10000, gridElectricityKwh: 1000 },
  primaryEnergy: 16500,
  archetypeFloorArea: 100,
} as EstimationResult;

const selfFundedOptions: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0 },
  incentives: { upfrontPercentage: 0 },
};

const renovatedScenario = {
  id: "renovated" as ScenarioId,
  packageId: "renovated",
  label: "After Renovation",
  epcClass: "B",
  annualEnergyNeeds: 5000,
  heatingCoolingNeeds: 5000,
  deliveredTotal: 7000,
  carrierBreakdown: { naturalGasKwh: 6000, gridElectricityKwh: 1000 },
  primaryEnergy: 9600,
  flexibilityIndex: 55,
  comfortIndex: 75,
  measureIds: ["wall-insulation"],
  measures: ["Wall Insulation"],
} as RenovationScenario;

const currentScenario = {
  id: "current" as ScenarioId,
  packageId: "current",
  label: "Current",
  epcClass: "D",
  annualEnergyNeeds: 15000,
  heatingCoolingNeeds: 15000,
  deliveredTotal: 11000,
  carrierBreakdown: { naturalGasKwh: 10000, gridElectricityKwh: 1000 },
  primaryEnergy: 16500,
  flexibilityIndex: 50,
  comfortIndex: 70,
  measureIds: [],
  measures: [],
} as RenovationScenario;

const secondScenario = {
  ...renovatedScenario,
  id: "package-windows" as ScenarioId,
  packageId: "package-windows",
  label: "Window Replacement",
  annualEnergyNeeds: 4000,
  heatingCoolingNeeds: 4000,
  deliveredTotal: 6500,
  carrierBreakdown: { naturalGasKwh: 5500, gridElectricityKwh: 1000 },
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
    mockAssessRisk.mockImplementation((request: RiskAssessmentRequest) =>
      Promise.resolve(wireResponseFor(request)),
    );
  });

  test("ARV request includes national EPC country and renovated energy intensity", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        target_country: "Greece",
        energy_consumption_before: 110,
        energy_consumption_after: 70,
      }),
    );
  });

  test("current ARV request uses current energy intensity without before value", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [currentScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        target_country: "Greece",
        energy_consumption_after: 110,
        renovated_last_5_years: false,
      }),
    );
    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.not.objectContaining({
        energy_consumption_before: expect.anything(),
      }),
    );
  });

  test("ARV request includes location and area", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
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

  test("ARV request derives construction_year from constructionPeriod when constructionYear is null", async () => {
    const service = new FinancialService();
    const buildingWithoutYear = {
      ...mockBuilding,
      constructionYear: null,
      constructionPeriod: "2000-2010",
    };

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      buildingWithoutYear,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        construction_year: 2005,
      }),
    );
  });

  test("ARV request maps Single Family House to Detached House property_type", async () => {
    const service = new FinancialService();
    const sfhBuilding = {
      ...mockBuilding,
      buildingType: "Single Family House",
    };

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      sfhBuilding,
    );

    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        property_type: "Detached House",
      }),
    );
  });

  test("risk assessment savings are carrier-aware electricity-equivalent kWh", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        annual_energy_savings: (4000 * 0.115) / 0.246,
      }),
    );
  });

  test("self-funded analysis sends a single equity scheme", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({ schemes: [{ scheme_type: "equity" }] }),
    );
  });

  test("system-only scenarios can trigger risk assessment from delivered-energy savings", async () => {
    const service = new FinancialService();

    const systemOnlyScenario: RenovationScenario = {
      ...renovatedScenario,
      id: "scenario-condensing-boiler",
      packageId: "scenario-condensing-boiler",
      label: "Condensing Boiler",
      annualEnergyNeeds: 15000,
      heatingCoolingNeeds: 15000,
      deliveredTotal: 9000,
      carrierBreakdown: { naturalGasKwh: 9000, gridElectricityKwh: 0 },
      primaryEnergy: 13000,
      measureIds: ["condensing-boiler"],
      measures: ["Condensing Boiler"],
    };

    await service.calculateForAllScenarios(
      [systemOnlyScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      {
        "scenario-condensing-boiler": {
          capex: 10000,
          annualMaintenanceCost: 300,
        },
      },
      mockBuilding,
    );

    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        annual_energy_savings:
          (1000 * 0.115 + 1000 * FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH) /
          FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      }),
    );
    expect(mockCalculateARV).toHaveBeenCalledWith(
      expect.objectContaining({
        energy_consumption_before: 110,
        energy_consumption_after: 90,
      }),
    );
  });

  test("negative delivered-energy savings are clamped to 0 and risk assessment is skipped", async () => {
    const service = new FinancialService();

    const highEnergyScenario: RenovationScenario = {
      ...renovatedScenario,
      deliveredTotal: 12000,
      carrierBreakdown: { naturalGasKwh: 13000, gridElectricityKwh: 1000 },
    };

    const results = await service.calculateForAllScenarios(
      [highEnergyScenario],
      selfFundedOptions,
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

  test("missing carrier totals skip detailed finance instead of falling back to thermal needs", async () => {
    const service = new FinancialService();

    const scenarioWithoutDelivered: RenovationScenario = {
      ...renovatedScenario,
      deliveredTotal: undefined,
      carrierBreakdown: undefined,
      primaryEnergy: undefined,
    };

    const results = await service.calculateForAllScenarios(
      [scenarioWithoutDelivered],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    expect(mockAssessRisk).not.toHaveBeenCalled();
    expect(results["renovated"].riskAssessment).toBeNull();
  });

  test("output level matches constructor argument with a single call", async () => {
    const service = new FinancialService("professional");

    await service.calculateForAllScenarios(
      [renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    // No supplemental private call any more: cashflow_distributions ships at all levels.
    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({ output_level: "professional" }),
    );
  });

  test("maps point forecasts, cash flow, and chart metadata from the scheme result", async () => {
    const service = new FinancialService("professional");

    const result = await service.assessRisk({
      annual_energy_savings: 4000,
      project_lifetime: 20,
      output_level: "professional",
      capex: 10000,
      annual_maintenance_cost: 300,
    });

    expect(result.pointForecasts.NPV).toBe(5000);
    expect(result.pointForecasts.SuccessRate).toBe(0.85);
    expect(result.cashFlowData?.cumulative_cash_flow).toEqual([
      -10000, -9700, -9400,
    ]);
    expect(result.metadata.chart_metadata?.NPV?.bins.centers).toEqual([0]);
    expect(result.probabilities?.["Pr(PBP < 20y)"]).toBe(0.9);
  });

  test("uses package-specific CAPEX and maintenance values for each scenario", async () => {
    const service = new FinancialService();

    await service.calculateForAllScenarios(
      [renovatedScenario, secondScenario],
      selfFundedOptions,
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

  test("debt financing sends a bank_loan scheme sized per package", async () => {
    const service = new FinancialService();
    const fundedOptions: FundingOptions = {
      financingType: "loan",
      loan: { percentage: 50, duration: 12 },
      incentives: { upfrontPercentage: 0 },
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
        schemes: [
          { scheme_type: "bank_loan", loan_amount: 5000, term_years: 12 },
        ],
      }),
    );
    expect(mockAssessRisk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        capex: 18000,
        schemes: [
          { scheme_type: "bank_loan", loan_amount: 9000, term_years: 12 },
        ],
      }),
    );
  });

  test("folds the upfront incentive into CAPEX and the loan amount", async () => {
    const service = new FinancialService();
    const fundedOptions: FundingOptions = {
      financingType: "loan",
      loan: { percentage: 50, duration: 12 },
      incentives: { upfrontPercentage: 20 },
    };

    await service.calculateForAllScenarios(
      [renovatedScenario],
      fundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      mockBuilding,
    );

    // 10000 * (1 - 0.20) = 8000 effective CAPEX; loan = 8000 * 0.5 = 4000.
    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        capex: 8000,
        schemes: [
          { scheme_type: "bank_loan", loan_amount: 4000, term_years: 12 },
        ],
      }),
    );
  });

  test("ARV failure (unsupported country) degrades gracefully without aborting the run", async () => {
    // ARV model does not support every country (e.g. Poland -> 400). The
    // financial run must still complete with all other metrics intact.
    mockCalculateARV.mockRejectedValue(
      new APIError(
        400,
        "Invalid input parameters: Unknown target_country: 'Poland'",
      ),
    );

    const service = new FinancialService();

    const results = await service.calculateForAllScenarios(
      [currentScenario, renovatedScenario],
      selfFundedOptions,
      100,
      mockEstimation,
      packageFinancialInputs,
      { ...mockBuilding, country: "Poland" },
    );

    // ARV is absent for every scenario, but the run resolved.
    expect(results["current"].arv).toBeNull();
    expect(results["current"].afterRenovationValue).toBeNull();
    expect(results["renovated"].arv).toBeNull();
    expect(results["renovated"].afterRenovationValue).toBeNull();

    // Risk-derived metrics are still computed from the (working) risk endpoint.
    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
    expect(results["renovated"].riskAssessment).not.toBeNull();
    expect(results["renovated"].netPresentValue).toBe(5000);
    expect(results["renovated"].returnOnInvestment).toBe(0.25);
    expect(results["renovated"].paybackTime).toBe(8);
    expect(results["renovated"].capitalExpenditure).toBe(10000);
  });
});
