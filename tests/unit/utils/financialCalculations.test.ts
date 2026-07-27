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
      mode: "percentage",
      upfrontPercentage: 0,
      upfrontAmount: 0,
    },
    ...overrides,
  };
}

describe("financialCalculations", () => {
  test("self-funded with zero incentives keeps full CAPEX and no loan", () => {
    expect(applyFundingReduction(10_000, createFundingOptions())).toEqual({
      effectiveCost: 10_000,
      loanAmount: 0,
      subsidyAmount: 0,
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
      subsidyAmount: 0,
    });
  });

  test("upfront incentive is folded into effective CAPEX and the loan amount", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10 },
      incentives: {
        mode: "percentage",
        upfrontPercentage: 20,
        upfrontAmount: 0,
      },
    });

    // 10000 * (1 - 0.20) = 8000 effective CAPEX; loan = 8000 * 0.5 = 4000.
    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 8_000,
      loanAmount: 4_000,
      subsidyAmount: 2_000,
    });
  });

  test("100 percent upfront incentive reduces CAPEX and loan to zero", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      incentives: {
        mode: "percentage",
        upfrontPercentage: 100,
        upfrontAmount: 0,
      },
    });

    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 0,
      loanAmount: 0,
      subsidyAmount: 10_000,
    });
  });

  test("fixed-amount subsidy is subtracted before the loan share is taken", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10 },
      incentives: {
        mode: "amount",
        upfrontPercentage: 20,
        upfrontAmount: 2_500,
      },
    });

    // The percentage value is ignored in "amount" mode: 10000 - 2500 = 7500
    // effective CAPEX; loan = 7500 * 0.5 = 3750.
    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 7_500,
      loanAmount: 3_750,
      subsidyAmount: 2_500,
    });
  });

  test("fixed-amount subsidy is clamped to the renovation cost", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      incentives: {
        mode: "amount",
        upfrontPercentage: 0,
        upfrontAmount: 18_000,
      },
    });

    // A fixed amount is not self-limiting the way a percentage is; without the
    // clamp this would send a negative capex, which the service rejects.
    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 0,
      loanAmount: 0,
      subsidyAmount: 10_000,
    });
  });

  test("switching mode reads the matching value and ignores the other", () => {
    const incentives = {
      upfrontPercentage: 20,
      upfrontAmount: 2_500,
    };

    const asPercentage = applyFundingReduction(
      10_000,
      createFundingOptions({
        incentives: { ...incentives, mode: "percentage" },
      }),
    );
    const asAmount = applyFundingReduction(
      10_000,
      createFundingOptions({ incentives: { ...incentives, mode: "amount" } }),
    );

    expect(asPercentage.subsidyAmount).toBe(2_000);
    expect(asAmount.subsidyAmount).toBe(2_500);
  });
});
