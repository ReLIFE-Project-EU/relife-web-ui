import { describe, expect, test } from "vitest";

import { resolveSavingsAvailability } from "../../../src/services/savingsState";
import type {
  FinancialResults,
  RenovationScenario,
} from "../../../src/types/renovation";

const scenario = {} as RenovationScenario;

function financials(
  overrides: Partial<FinancialResults> = {},
): FinancialResults {
  return {
    arv: null,
    riskAssessment: null,
    capitalExpenditure: 10_000,
    returnOnInvestment: 0,
    paybackTime: 0,
    netPresentValue: 0,
    afterRenovationValue: null,
    ...overrides,
  };
}

describe("resolveSavingsAvailability", () => {
  test("reports appraised when the risk assessment ran", () => {
    const state = resolveSavingsAvailability(
      scenario,
      financials({
        riskAssessment: {} as FinancialResults["riskAssessment"],
      }),
    );

    expect(state).toBe("appraised");
  });

  test("distinguishes each reason the assessment was skipped", () => {
    const availabilityFor = (reason: FinancialResults["riskSkippedReason"]) =>
      resolveSavingsAvailability(
        scenario,
        financials({ riskSkippedReason: reason }),
      );

    expect(availabilityFor("fully-subsidized")).toBe("fully-funded");
    expect(availabilityFor("missing-carrier-breakdown")).toBe("not-priceable");
    expect(availabilityFor("non-positive-savings")).toBe("no-savings");
  });

  test("reports unknown without financials or scenarios", () => {
    expect(resolveSavingsAvailability(scenario, undefined)).toBe("unknown");
    expect(resolveSavingsAvailability(undefined, financials())).toBe("unknown");
    // A skipped assessment carrying no reason cannot be classified either.
    expect(resolveSavingsAvailability(scenario, financials())).toBe("unknown");
  });
});
