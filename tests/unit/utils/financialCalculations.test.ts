import { describe, expect, test } from "vitest";
import {
  applyFundingReduction,
  sanitizeLifetimeIncentives,
} from "../../../src/utils/financialCalculations";
import type { FundingOptions } from "../../../src/types/renovation";

function createFundingOptions(
  overrides: Partial<FundingOptions> = {},
): FundingOptions {
  return {
    financingType: "self-funded",
    loan: {
      percentage: 80,
      duration: 10,
      interestRate: 0.05,
    },
    incentives: {
      upfrontPercentage: 0,
      lifetimeAmount: 0,
      lifetimeYears: 0,
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

  test("loan with zero incentives derives loan amount from original CAPEX", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10, interestRate: 0.05 },
    });

    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 10_000,
      loanAmount: 5_000,
    });
  });

  test("loan with upfront incentive uses post-incentive CAPEX for loan amount", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 50, duration: 10, interestRate: 0.05 },
      incentives: {
        upfrontPercentage: 20,
        lifetimeAmount: 0,
        lifetimeYears: 0,
      },
    });

    expect(applyFundingReduction(10_000, fundingOptions)).toEqual({
      effectiveCost: 10_000,
      loanAmount: 4_000,
    });
  });

  test("zero upfront incentive leaves loan amount unchanged", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      loan: { percentage: 80, duration: 10, interestRate: 0.05 },
    });

    expect(applyFundingReduction(10_000, fundingOptions).loanAmount).toBe(
      8_000,
    );
  });

  test("100 percent upfront incentive reduces loan amount to zero", () => {
    const fundingOptions = createFundingOptions({
      financingType: "loan",
      incentives: {
        upfrontPercentage: 100,
        lifetimeAmount: 0,
        lifetimeYears: 0,
      },
    });

    expect(applyFundingReduction(10_000, fundingOptions).loanAmount).toBe(0);
  });

  test("zeroes lifetime incentives when amount is positive but years are zero", () => {
    expect(sanitizeLifetimeIncentives(500, 0, 20)).toEqual({
      lifetimeAmount: 0,
      lifetimeYears: 0,
    });
  });

  test("zeroes lifetime incentives when years are positive but amount is zero", () => {
    expect(sanitizeLifetimeIncentives(0, 5, 20)).toEqual({
      lifetimeAmount: 0,
      lifetimeYears: 0,
    });
  });

  test("passes through active lifetime incentives", () => {
    expect(sanitizeLifetimeIncentives(500, 5, 20)).toEqual({
      lifetimeAmount: 500,
      lifetimeYears: 5,
    });
  });

  test("clamps lifetime incentive years to project lifetime", () => {
    expect(sanitizeLifetimeIncentives(500, 25, 20)).toEqual({
      lifetimeAmount: 500,
      lifetimeYears: 20,
    });
  });
});
