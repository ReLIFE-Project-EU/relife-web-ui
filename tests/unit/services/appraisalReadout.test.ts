import { expect, test } from "vitest";
import { readMetric, readRange } from "../../../src/services/appraisalReadout";
import type { AppraisedPackage } from "../../../src/types/renovation";

function appraised(
  pointForecasts: Partial<AppraisedPackage["pointForecasts"]> = {},
  extra: Partial<AppraisedPackage> = {},
): AppraisedPackage {
  return {
    kind: "appraised",
    pointForecasts: {
      NPV: 5000,
      IRR: 0.05,
      ROI: 0.25,
      PBP: 8.5,
      DPP: 11,
      MonthlyAvgSavings: 100,
      SuccessRate: 0.8,
      ...pointForecasts,
    },
    metadata: { project_lifetime: 20, capex: 100, output_level: "private" },
    ...extra,
  };
}

test.each([
  ["PBP", 20, "value"],
  ["PBP", 21, "over-lifetime"],
  ["DPP", 20.4, "over-lifetime"],
  ["PBP", 0, "immediate"],
] as const)("classifies %s = %s before rounding", (metric, value, kind) => {
  expect(readMetric(appraised({ [metric]: value }), metric).kind).toBe(kind);
});

test.each([
  [0, "no-upfront-investment"],
  [100, "over-lifetime"],
] as const)(
  "identifies the undefined-ratio cause with upfront investment %s",
  (initial_investment, cause) => {
    const appraisal = appraised(
      { IRR: null },
      {
        cashFlowData: {
          years: [],
          annual_inflows: [],
          annual_outflows: [],
          initial_investment,
        },
      },
    );
    expect(readMetric(appraisal, "IRR")).toMatchObject({
      kind: "not-applicable",
      cause,
    });
  },
);

test.each([
  [8, 21, true],
  [20.5, 21, false],
] as const)(
  "keeps a payback range %s to %s only if it includes reachable payback",
  (P10, P90, available) => {
    const appraisal = appraised(
      {},
      { percentiles: { PBP: { P10, P50: P10, P90 } } },
    );
    expect(readRange(appraisal, "PBP") !== undefined).toBe(available);
  },
);
