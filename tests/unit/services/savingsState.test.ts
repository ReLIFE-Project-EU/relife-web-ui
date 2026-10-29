import { describe, expect, test } from "vitest";

import { resolveSavingsAvailability } from "../../../src/services/savingsState";
import type {
  AppraisalSkipReason,
  AppraisedPackage,
  FinancialResults,
  PackageAppraisal,
  RenovationScenario,
} from "../../../src/types/renovation";

const scenario = {} as RenovationScenario;

function financials(appraisal: PackageAppraisal): FinancialResults {
  return {
    arv: null,
    appraisal,
    capitalExpenditure: 10_000,
    afterRenovationValue: null,
  };
}

const appraised = { kind: "appraised" } as AppraisedPackage;

describe("resolveSavingsAvailability", () => {
  test("reports appraised when the Financial service calculated it", () => {
    expect(resolveSavingsAvailability(scenario, financials(appraised))).toBe(
      "appraised",
    );
  });

  test("distinguishes each reason the appraisal was skipped", () => {
    const availabilityFor = (reason: AppraisalSkipReason) =>
      resolveSavingsAvailability(
        scenario,
        financials({ kind: "skipped", reason }),
      );

    expect(availabilityFor("fully-subsidized")).toBe("fully-funded");
    expect(availabilityFor("missing-carrier-breakdown")).toBe("not-priceable");
    expect(availabilityFor("non-positive-savings")).toBe("no-savings");
  });

  test("reports unknown without financials or scenarios", () => {
    expect(resolveSavingsAvailability(scenario, undefined)).toBe("unknown");
    expect(resolveSavingsAvailability(undefined, financials(appraised))).toBe(
      "unknown",
    );
  });
});
