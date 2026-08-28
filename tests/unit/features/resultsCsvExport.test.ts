import { describe, expect, test } from "vitest";
import {
  buildBuildingsCsv,
  buildSummaryCsv,
} from "../../../src/features/portfolio-advisor/services/resultsCsvExport";
import type {
  BuildingAnalysisResult,
  PRABuilding,
} from "../../../src/features/portfolio-advisor/context/types";
import type { PortfolioPackageAggregate } from "../../../src/features/portfolio-advisor/services/portfolioAggregation";

function building(id: string, name: string): PRABuilding {
  return {
    id,
    name,
    source: "manual",
    category: "Single Family House",
    country: "Italy",
    lat: 41.9,
    lng: 12.5,
    floorArea: 120,
    constructionPeriod: "1946-1969",
    numberOfFloors: 2,
    propertyType: "owner",
    validationStatus: "valid",
  };
}

const successResult = {
  buildingId: "b1",
  status: "success",
  estimation: {
    estimatedEPC: "D",
    annualEnergyNeeds: 20000,
    deliveredTotal: 18000,
  },
  scenarios: [
    {
      id: "renovated",
      epcClass: "B",
      annualEnergyNeeds: 12000,
      deliveredTotal: 10000,
    },
  ],
  financialResults: {
    capitalExpenditure: 50000,
    afterRenovationValue: 250000,
    arv: { priceIncreasePct: 12.5 },
    netPresentValue: 30000,
    returnOnInvestment: 0.12,
    paybackTime: 8.5,
    riskAssessment: {
      pointForecasts: { IRR: 0.07, DPP: 10.2 },
    },
    probabilities: {
      "Pr(NPV > 0)": 0.82,
      "Pr(PBP < 20y)": 0.71,
      "Pr(DPP < 20y)": 0.64,
    },
  },
} as unknown as BuildingAnalysisResult;

const errorResult = {
  buildingId: "b2",
  status: "error",
  error: "Forecasting API failed",
} as unknown as BuildingAnalysisResult;

const rejectedResult = {
  buildingId: "b3",
  status: "rejected",
} as unknown as BuildingAnalysisResult;

describe("buildBuildingsCsv", () => {
  const buildings = [
    building("b1", "Alpha"),
    building("b2", "Beta"),
    building("b3", "Gamma"),
  ];
  const results: Record<string, BuildingAnalysisResult> = {
    b1: successResult,
    b2: errorResult,
    b3: rejectedResult,
  };

  const csv = buildBuildingsCsv(buildings, results);
  const lines = csv.split("\r\n");
  const header = lines[0].split(",");
  const dataRows = lines.slice(1).map((line) => line.split(","));
  const cell = (row: string[], col: string) => row[header.indexOf(col)];

  test("emits one row per building in input order", () => {
    expect(dataRows).toHaveLength(3);
    expect(dataRows.map((r) => cell(r, "Building"))).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  test("writes raw success metrics", () => {
    const row = dataRows[0];
    expect(cell(row, "Status")).toBe("success");
    expect(cell(row, "NPV (EUR)")).toBe("30000");
    expect(cell(row, "ROI (ratio)")).toBe("0.12");
    expect(cell(row, "IRR (ratio)")).toBe("0.07");
    expect(cell(row, "Discounted payback (years)")).toBe("10.2");
    expect(cell(row, "Pr(NPV > 0)")).toBe("0.82");
    // Lifetime-dynamic probability keys are matched by prefix, not literally.
    expect(cell(row, "Pr(PBP < project lifetime)")).toBe("0.71");
    expect(cell(row, "Pr(DPP < project lifetime)")).toBe("0.64");
    // The ARV model is Greek-only: absolute prices are withheld outside Greece
    // (these fixtures are Italian), while the relative uplift is kept as-is.
    expect(cell(row, "ARV (EUR - Greek market model)")).toBe("");
    expect(cell(row, "ARV uplift (% - Greek market model)")).toBe("12.5");
  });

  test("blanks metric cells for non-success rows but keeps status", () => {
    const errorRow = dataRows[1];
    expect(cell(errorRow, "Status")).toBe("error");
    expect(cell(errorRow, "NPV (EUR)")).toBe("");
    expect(cell(errorRow, "EPC before")).toBe("");

    const rejectedRow = dataRows[2];
    expect(cell(rejectedRow, "Status")).toBe("rejected");
    expect(cell(rejectedRow, "CAPEX (EUR)")).toBe("");
  });
});

describe("buildSummaryCsv", () => {
  const aggregate: PortfolioPackageAggregate = {
    packageId: "renovated",
    coverage: {
      totalBuildings: 3,
      contributing: 1,
      errored: 1,
      rejected: 1,
      withoutPackage: 0,
    },
    totalCapexEur: 50000,
    totalNpvEur: 30000,
    totalAnnualMaintenanceEur: 600,
    totalThermalNeedsBeforeKwh: 20000,
    totalThermalNeedsAfterKwh: 12000,
    totalDeliveredBeforeKwh: undefined,
    totalDeliveredAfterKwh: undefined,
    totalAnnualEmissionsBeforeTon: 8,
    totalAnnualEmissionsAfterTon: 3,
    totalEmbodiedCarbonTon: 12,
    totalWholeLifeCarbonTon: 72,
    portfolioRoi: 0.12,
    portfolioPaybackYears: 8.5,
    epcCountsBefore: { E: 1 },
    epcCountsAfter: { B: 1 },
  };

  test("emits a Metric,Value table with raw aggregates", () => {
    const csv = buildSummaryCsv(aggregate);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Metric,Value");
    expect(lines).toContain("Total buildings,3");
    expect(lines).toContain("Buildings in totals,1");
    expect(lines).toContain("Portfolio ROI (ratio),0.12");
    expect(lines).toContain("Total NPV (EUR),30000");
    expect(lines).toContain("Total material carbon (t CO2e),12");
  });

  test("leaves unavailable totals empty rather than writing a zero", () => {
    const lines = buildSummaryCsv(aggregate).split("\r\n");

    expect(lines).toContain("Total system energy before (kWh/year),");
  });

  test("lists only the EPC classes the portfolio occupies", () => {
    const lines = buildSummaryCsv(aggregate).split("\r\n");

    expect(lines).toContain("EPC B before (buildings),0");
    expect(lines).toContain("EPC B after (buildings),1");
    expect(lines).toContain("EPC E before (buildings),1");
    expect(lines.some((line) => line.startsWith("EPC G "))).toBe(false);
  });
});
