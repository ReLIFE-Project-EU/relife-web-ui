import { beforeEach, describe, expect, test, vi } from "vitest";
import type { FundingOptions } from "../../../src/types/renovation";
import type { RiskAssessmentRequest } from "../../../src/types/financial";

const { mockAssessRisk } = vi.hoisted(() => ({
  mockAssessRisk: vi.fn(),
}));

vi.mock("../../../src/api", () => ({
  financial: { assessRisk: mockAssessRisk },
}));

import {
  ENERGY_TARIFF_DEFAULTS,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "../../../src/services/carrierSavingsService";
import {
  appraisePackage,
  type PackageAppraisalInput,
} from "../../../src/services/packageAppraisal";

/** A single scheme's result in the multi-scheme wire shape. */
const schemeResultStub = {
  scheme_id: 1,
  scheme_family: "self_financed",
  summary: {
    percentiles: {
      NPV: { P10: 1000, P50: 5000, P90: 9000 },
      IRR: { P10: 0.03, P50: 0.057, P90: 0.09 },
      ROI: { P10: 0.1, P50: 0.25, P90: 0.4 },
      PBP: { P10: 6, P50: 8, P90: 12 },
      DPP: { P10: 7, P50: 10, P90: 14 },
    },
    probabilities: { "Pr(NPV > 0)": 0.85, "Pr(PBP < 20y)": 0.9 },
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

const selfFunded: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0 },
  incentives: { mode: "percentage", upfrontPercentage: 0, upfrontAmount: 0 },
};

/** 4000 kWh less gas; electricity unchanged. */
const baseInput: PackageAppraisalInput = {
  capex: 10000,
  annualMaintenanceCost: 300,
  funding: selfFunded,
  projectLifetime: 20,
  baselineCarriers: { naturalGasKwh: 10000, gridElectricityKwh: 1000 },
  packageCarriers: { naturalGasKwh: 6000, gridElectricityKwh: 1000 },
  gasTariffEurPerKwh: ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
  outputLevel: "private",
};

describe("appraisePackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssessRisk.mockImplementation((request: RiskAssessmentRequest) =>
      Promise.resolve({
        results: Object.fromEntries(
          request.schemes.map((s) => [s.scheme_type, schemeResultStub]),
        ),
        metadata: { capex: request.capex },
      }),
    );
  });

  test("appraises a self-funded package from its electricity-equivalent savings", async () => {
    const result = await appraisePackage(baseInput);

    expect(mockAssessRisk).toHaveBeenCalledWith({
      capex: 10000,
      annual_maintenance_cost: 300,
      annual_energy_savings:
        (4000 * ENERGY_TARIFF_DEFAULTS.gasEurPerKwh) /
        FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      project_lifetime: 20,
      output_level: "private",
      schemes: [{ scheme_type: "equity" }],
    });
    expect(result.effectiveCapex).toBe(10000);
    expect(result.appraisal.kind).toBe("appraised");
    if (result.appraisal.kind !== "appraised") return;
    expect(result.appraisal.pointForecasts.NPV).toBe(5000);
    expect(result.appraisal.pointForecasts.ROI).toBe(0.25);
    expect(result.appraisal.probabilities?.["Pr(PBP < 20y)"]).toBe(0.9);
    expect(result.appraisal.cashFlowData?.cumulative_cash_flow).toEqual([
      -10000, -9700, -9400,
    ]);
    expect(result.appraisal.metadata.chart_metadata?.NPV?.bins.centers).toEqual(
      [0],
    );
  });

  test("folds the subsidy into CAPEX and draws the loan on what remains", async () => {
    const result = await appraisePackage({
      ...baseInput,
      funding: {
        financingType: "loan",
        loan: { percentage: 50, duration: 12 },
        incentives: {
          mode: "percentage",
          upfrontPercentage: 20,
          upfrontAmount: 0,
        },
      },
    });

    // 10000 * (1 - 0.20) = 8000 effective CAPEX; loan = 8000 * 0.5 = 4000.
    expect(mockAssessRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        capex: 8000,
        schemes: [
          { scheme_type: "bank_loan", loan_amount: 4000, term_years: 12 },
        ],
      }),
    );
    expect(result.effectiveCapex).toBe(8000);
  });

  test.each<[string, Partial<PackageAppraisalInput>, string]>([
    [
      "a subsidy covers the whole cost",
      {
        funding: {
          ...selfFunded,
          incentives: {
            mode: "percentage",
            upfrontPercentage: 100,
            upfrontAmount: 0,
          },
        },
      },
      "fully-subsidized",
    ],
    [
      "the package costs more to run than the baseline",
      { packageCarriers: { naturalGasKwh: 13000, gridElectricityKwh: 1000 } },
      "non-positive-savings",
    ],
    [
      "the package has no carrier split",
      { packageCarriers: undefined },
      "missing-carrier-breakdown",
    ],
  ])(
    "skips without calling the service when %s",
    async (_, override, reason) => {
      const result = await appraisePackage({ ...baseInput, ...override });

      expect(mockAssessRisk).not.toHaveBeenCalled();
      expect(result.appraisal).toEqual({ kind: "skipped", reason });
    },
  );
});
