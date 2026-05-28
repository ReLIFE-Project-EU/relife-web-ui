import { describe, expect, test } from "vitest";
import { applyFundingReduction } from "../../../src/utils/financialCalculations";
import type { FundingOptions } from "../../../src/types/renovation";

function createFundingOptions(
  overrides: Partial<FundingOptions> = {},
): FundingOptions {
  return {
    financingType: "self-funded",
    loan: {
      percentage: 80,
      duration: 10,
    },
    incentives: {
      upfrontPercentage: 0,
    },
    ...overrides,
  };
}

describe("financialCalculations", () => {
  test("self-funded with zero incentives keeps full CAPEX and no loan", () => {
    expect(applyFundingReduction(10_000, createFundingOptions())).toEqual({
      effectiveCost: 10_000,
      loanAmount: 0,
    });
  });

  test("loan with zero incentives derives loan amount from full CAPEX", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10 },
    });

    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 10_000,
      loanAmount: 5_000,
    });
  });

  test("upfront incentive is folded into effective CAPEX and the loan amount", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10 },
      incentives: { upfrontPercentage: 20 },
    });

    // 10000 * (1 - 0.20) = 8000 effective CAPEX; loan = 8000 * 0.5 = 4000.
    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 8_000,
      loanAmount: 4_000,
    });
  });

  test("100 percent upfront incentive reduces CAPEX and loan to zero", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      incentives: { upfrontPercentage: 100 },
    });

    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 0,
      loanAmount: 0,
    });
  });
});
