import { expect, test } from "vitest";
import { buildingExportColumns } from "../../../src/features/portfolio-advisor/services/resultsCsvExport";
import type {
  BuildingAnalysisResult,
  PRABuilding,
} from "../../../src/features/portfolio-advisor/context/types";

const result = {
  buildingId: "b1",
  status: "success",
  estimation: { baseline: { thermalNeed: 20000 } },
  scenarios: [
    { id: "current", deliveredTotal: 17000 },
    {
      id: "renovated",
      annualEmissionsTonCo2e: 2.5,
      embodiedCarbonKgCo2e: 8000,
    },
  ],
  financialResults: {
    afterRenovationValue: 250000,
    arv: { priceIncreasePct: 12.5 },
    appraisal: {
      kind: "appraised",
      probabilities: { "Pr(PBP < 30y)": 0.71 },
    },
  },
} as unknown as BuildingAnalysisResult;

const valueOf = (key: string, country = "Italy") =>
  buildingExportColumns
    .find((column) => column.key === key)!
    .value({
      building: { country } as PRABuilding,
      result,
      projectLifetimeYears: 30,
    });

test("exports delivered energy from the simulated baseline", () => {
  expect(valueOf("systemBefore")).toBe(17000);
});

test("passes the configured lifetime into the carbon calculation", () => {
  expect(valueOf("wholeLifeCarbon")).toBe(83000);
});

test("matches probabilities independently of the lifetime in their keys", () => {
  expect(valueOf("prPbp")).toBe(0.71);
});

test("exports absolute ARV only for Greece and retains indicative uplift elsewhere", () => {
  expect(valueOf("arv", "Greece")).toBe(250000);
  expect(valueOf("arv", "Italy")).toBeUndefined();
  expect(valueOf("arvUpliftPct", "Italy")).toBe(12.5);
});
