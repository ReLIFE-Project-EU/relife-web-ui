import { describe, expect, test } from "vitest";
import {
  buildSchemes,
  mapWireRiskResponse,
} from "../../../src/services/riskAssessmentAdapter";
import type { RiskAssessmentResponse } from "../../../src/types/financial";

describe("buildSchemes", () => {
  test("returns an equity scheme when there is no loan", () => {
    expect(buildSchemes({ loanAmount: 0, loanTerm: 0 })).toEqual({
      schemes: [{ scheme_type: "equity" }],
      schemeType: "equity",
    });
  });

  test("returns a rounded bank_loan scheme when a loan is present", () => {
    expect(buildSchemes({ loanAmount: 24999.6, loanTerm: 15 })).toEqual({
      schemes: [
        { scheme_type: "bank_loan", loan_amount: 25000, term_years: 15 },
      ],
      schemeType: "bank_loan",
    });
  });

  test("falls back to equity when a loan amount has no term", () => {
    expect(buildSchemes({ loanAmount: 5000, loanTerm: 0 }).schemeType).toBe(
      "equity",
    );
  });
});

function fixture(): RiskAssessmentResponse {
  return {
    metadata: { capex: 60000, project_lifetime: 20, n_schemes: 1 },
    results: {
      equity: {
        scheme_id: 1,
        scheme_family: "self_financed",
        summary: {
          percentiles: {
            NPV: { P5: -2000, P10: 1000, P50: 15400, P90: 32000, P95: 38000 },
            IRR: { P10: 0.03, P50: 0.084, P90: 0.14 },
            ROI: { P10: 0.1, P50: 0.25, P90: 0.4 },
            PBP: { P10: 7, P50: 10.9, P90: 17 },
            DPP: { P10: 8, P50: 12.5, P90: 19 },
          },
          probabilities: {
            "Pr(NPV > 0)": 0.952,
            "Pr(PBP < 20y)": 0.97,
            "Pr(DPP < 20y)": 0.9,
          },
          disc_target_used: 0.05,
          n_sims: 10000,
        },
        cashflow_distributions: {
          years: [0, 1, 2],
          cash_flows: { P50: [-1000, 600, 600] },
          inflows: { P50: [0, 700, 700] },
          outflows: { P50: [0, 100, 100] },
        },
        kpi_histograms: {
          NPV: {
            bin_edges: [0, 10, 20],
            feasible_counts: [1, 3],
            infeasible_counts: [0, 1],
            p10: 1000,
            p50: 15400,
            p90: 32000,
            project_lifetime: null,
          },
        },
      },
    },
  };
}

describe("mapWireRiskResponse", () => {
  const mapped = mapWireRiskResponse(fixture(), {
    schemeType: "equity",
    projectLifetime: 20,
  });

  test("derives point forecasts from the P50 percentiles", () => {
    expect(mapped.pointForecasts.NPV).toBe(15400);
    expect(mapped.pointForecasts.IRR).toBe(0.084);
    expect(mapped.pointForecasts.PBP).toBe(10.9);
    expect(mapped.pointForecasts.DPP).toBe(12.5);
  });

  test("maps SuccessRate from Pr(NPV > 0) and derives MonthlyAvgSavings", () => {
    expect(mapped.pointForecasts.SuccessRate).toBe(0.952);
    // mean of inflows years 1..2 = 700; / 12
    expect(mapped.pointForecasts.MonthlyAvgSavings).toBeCloseTo(700 / 12, 5);
  });

  test("keeps lifetime-dynamic probability keys verbatim", () => {
    expect(mapped.probabilities?.["Pr(PBP < 20y)"]).toBe(0.97);
  });

  test("maps P10/P50/P90 percentiles per indicator", () => {
    expect(mapped.percentiles?.NPV).toEqual({
      P10: 1000,
      P50: 15400,
      P90: 32000,
    });
  });

  test("derives cumulative cash flow and breakeven year", () => {
    expect(mapped.cashFlowData?.annual_net_cash_flow).toEqual([
      -1000, 600, 600,
    ]);
    expect(mapped.cashFlowData?.cumulative_cash_flow).toEqual([
      -1000, -400, 200,
    ]);
    expect(mapped.cashFlowData?.breakeven_year).toBe(2);
    expect(mapped.cashFlowData?.initial_investment).toBe(1000);
  });

  test("adapts kpi histograms into chart metadata (feasible + infeasible)", () => {
    const npv = mapped.chartMetadata?.NPV;
    expect(npv?.bins.centers).toEqual([5, 15]);
    expect(npv?.bins.counts).toEqual([1, 4]);
    expect(npv?.statistics.P50).toBe(15400);
  });

  test("throws when the requested scheme is absent", () => {
    expect(() =>
      mapWireRiskResponse(fixture(), {
        schemeType: "bank_loan",
        projectLifetime: 20,
      }),
    ).toThrow(/no result for scheme/);
  });
});
