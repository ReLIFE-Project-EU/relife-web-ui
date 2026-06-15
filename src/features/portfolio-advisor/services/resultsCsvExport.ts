/**
 * CSV export definitions for the Portfolio Renovation Advisor results screen.
 *
 * The two `*Columns` arrays are the editable "row entity": add/remove a column
 * by editing an entry, hide one for a given export with `include: false`. Both
 * builders feed the shared `serializeCsv` engine, so values are written raw
 * (machine-readable) with units carried in the headers.
 */

import { serializeCsv, type CsvColumn } from "../../../utils/csvExport";
import { calculatePercentChange } from "../../../utils/formatters";
import { getEPCImprovement } from "../../../utils/epcUtils";
import type { PortfolioStats } from "../components/steps/ResultsStep";
import type { BuildingAnalysisResult, PRABuilding } from "../context/types";

interface BuildingExportRow {
  building: PRABuilding;
  result: BuildingAnalysisResult;
}

/** Renovated scenario for a result, mirroring the table's lookup. */
function renovatedOf(result: BuildingAnalysisResult) {
  return result.scenarios?.find((s) => s.id === "renovated");
}

/**
 * Look up a success-probability by indicator prefix. The Financial API emits
 * lifetime-dependent keys (e.g. "Pr(PBP < 20y)"), so match on the prefix
 * rather than a fixed key.
 */
function probabilityByPrefix(
  result: BuildingAnalysisResult,
  prefix: string,
): number | undefined {
  const probabilities = result.financialResults?.probabilities;
  if (!probabilities) return undefined;
  const key = Object.keys(probabilities).find((k) => k.startsWith(prefix));
  return key ? probabilities[key] : undefined;
}

/**
 * Status as exported: "success" splits into "no-savings" when financial
 * indicators are not meaningful, matching the on-screen badge semantics.
 */
function statusLabel({ result }: BuildingExportRow): string {
  if (result.status !== "success") return result.status;
  const noSavings =
    result.financialResults?.riskAssessment === null && !!renovatedOf(result);
  return noSavings ? "no-savings" : "success";
}

export const buildingExportColumns: CsvColumn<BuildingExportRow>[] = [
  { key: "name", header: "Building", value: (r) => r.building.name },
  { key: "status", header: "Status", value: statusLabel },
  { key: "country", header: "Country", value: (r) => r.building.country },
  { key: "category", header: "Category", value: (r) => r.building.category },
  {
    key: "floorArea",
    header: "Floor area (m2)",
    value: (r) => r.building.floorArea,
  },
  {
    key: "epcBefore",
    header: "EPC before",
    value: (r) => r.result.estimation?.estimatedEPC,
  },
  {
    key: "epcAfter",
    header: "EPC after",
    value: (r) => renovatedOf(r.result)?.epcClass,
  },
  {
    key: "epcImprovement",
    header: "EPC improvement (classes)",
    value: (r) => {
      const before = r.result.estimation?.estimatedEPC;
      const after = renovatedOf(r.result)?.epcClass;
      return before && after ? getEPCImprovement(before, after) : undefined;
    },
  },
  {
    key: "thermalBefore",
    header: "Annual thermal needs before (kWh/year)",
    value: (r) => r.result.estimation?.annualEnergyNeeds,
  },
  {
    key: "thermalAfter",
    header: "Annual thermal needs after (kWh/year)",
    value: (r) => renovatedOf(r.result)?.annualEnergyNeeds,
  },
  {
    key: "energyReduction",
    header: "Energy reduction (%)",
    value: (r) => {
      const before = r.result.estimation?.annualEnergyNeeds;
      const after = renovatedOf(r.result)?.annualEnergyNeeds;
      return before !== undefined && after !== undefined && before > 0
        ? calculatePercentChange(before, after)
        : undefined;
    },
  },
  {
    key: "systemBefore",
    header: "System energy before (kWh/year)",
    value: (r) => r.result.estimation?.deliveredTotal,
  },
  {
    key: "systemAfter",
    header: "System energy after (kWh/year)",
    value: (r) => renovatedOf(r.result)?.deliveredTotal,
  },
  {
    key: "capex",
    header: "CAPEX (EUR)",
    value: (r) => r.result.financialResults?.capitalExpenditure,
  },
  {
    key: "costSource",
    header: "Cost source",
    // "lookup" when a cost was resolved from EU reference data (no override),
    // "override" when it came from a per-building/global value. Reported per
    // field; blank for non-success rows that never resolved costs.
    value: (r) => {
      const cs = r.result.costSource;
      if (!cs) return undefined;
      const capex = cs.capexFromLookup ? "lookup" : "override";
      const opex = cs.opexFromLookup ? "lookup" : "override";
      return `capex:${capex};opex:${opex}`;
    },
  },
  {
    key: "arv",
    header: "ARV (EUR)",
    value: (r) => r.result.financialResults?.afterRenovationValue,
  },
  {
    key: "npv",
    header: "NPV (EUR)",
    value: (r) => r.result.financialResults?.netPresentValue,
  },
  {
    key: "roi",
    header: "ROI (ratio)",
    value: (r) => r.result.financialResults?.returnOnInvestment,
  },
  {
    key: "irr",
    header: "IRR (ratio)",
    value: (r) => r.result.financialResults?.riskAssessment?.pointForecasts.IRR,
  },
  {
    key: "pbp",
    header: "Payback period (years)",
    value: (r) => r.result.financialResults?.paybackTime,
  },
  {
    key: "dpp",
    header: "Discounted payback (years)",
    value: (r) => r.result.financialResults?.riskAssessment?.pointForecasts.DPP,
  },
  {
    key: "prNpv",
    header: "Pr(NPV > 0)",
    value: (r) => probabilityByPrefix(r.result, "Pr(NPV"),
  },
  {
    key: "prPbp",
    header: "Pr(PBP < project lifetime)",
    value: (r) => probabilityByPrefix(r.result, "Pr(PBP"),
  },
  {
    key: "prDpp",
    header: "Pr(DPP < project lifetime)",
    value: (r) => probabilityByPrefix(r.result, "Pr(DPP"),
  },
];

/** One row per building, in input order, regardless of table filter/sort. */
export function buildBuildingsCsv(
  buildings: PRABuilding[],
  results: Record<string, BuildingAnalysisResult>,
): string {
  const rows = buildings
    .map((building) => {
      const result = results[building.id];
      return result ? { building, result } : null;
    })
    .filter((row): row is BuildingExportRow => row !== null);
  return serializeCsv(rows, buildingExportColumns);
}

interface SummaryRow {
  metric: string;
  value: string | number | null;
}

const summaryColumns: CsvColumn<SummaryRow>[] = [
  { key: "metric", header: "Metric", value: (r) => r.metric },
  { key: "value", header: "Value", value: (r) => r.value },
];

/** Portfolio aggregates as a Metric,Value table (same serializer). */
export function buildSummaryCsv(stats: PortfolioStats): string {
  const rows: SummaryRow[] = [
    { metric: "Total buildings", value: stats.totalBuildings },
    { metric: "Successfully analyzed", value: stats.successCount },
    { metric: "Errors", value: stats.errorCount },
    { metric: "Rejected", value: stats.rejectedCount },
    { metric: "Total CAPEX (EUR)", value: stats.totalCapex },
    { metric: "Avg NPV (EUR)", value: stats.avgNPV },
    { metric: "Avg ROI (ratio)", value: stats.avgROI },
    { metric: "Avg payback period (years)", value: stats.avgPBP },
    { metric: "Avg energy reduction (%)", value: stats.avgEnergyReduction },
    {
      metric: "Avg EPC improvement (classes)",
      value: stats.avgEPCImprovement,
    },
    {
      metric: "Total thermal needs before (kWh/year)",
      value: stats.totalEnergyBefore,
    },
    {
      metric: "Total thermal needs after (kWh/year)",
      value: stats.totalEnergyAfter,
    },
  ];
  return serializeCsv(rows, summaryColumns);
}
