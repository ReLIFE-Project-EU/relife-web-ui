/**
 * CSV export definitions for the Portfolio Renovation Advisor results screen.
 *
 * The two `*Columns` arrays are the editable "row entity": add/remove a column
 * by editing an entry, hide one for a given export with `include: false`. Both
 * builders feed the shared `serializeCsv` engine, so values are written raw
 * (machine-readable) with units carried in the headers.
 */

import { serializeCsv, type CsvColumn } from "../../../utils/csvExport";
import { getEnergyReduction } from "../../../utils/formatters";
import { getCountryCode } from "../../../utils/countries";
import { getEPCImprovement, occupiedEpcClasses } from "../../../utils/epcUtils";
import { computeLifetimeCarbonKgCo2e } from "../../../services/carrierSavingsService";
import { resolveSavingsAvailability } from "../../../services/savingsState";
import type { PortfolioPackageAggregate } from "./portfolioAggregation";
import { baselineScenarioOf, renovatedOf } from "./scenarioLookup";
import type { BuildingAnalysisResult, PRABuilding } from "../context/types";

interface BuildingExportRow {
  building: PRABuilding;
  result: BuildingAnalysisResult;
  /** Configured horizon, always supplied by the caller. */
  projectLifetimeYears: number;
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
 * Status as exported: a successful row reports why its financial figures are or
 * are not trustworthy, using the same classification as the on-screen badge so
 * the export cannot become a second vocabulary.
 */
function statusLabel({ result }: BuildingExportRow): string {
  if (result.status !== "success") return result.status;
  const availability = resolveSavingsAvailability(
    renovatedOf(result),
    result.financialResults,
  );
  return availability === "appraised" ? "success" : availability;
}

const buildingExportColumns: CsvColumn<BuildingExportRow>[] = [
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
    value: (r) =>
      getEnergyReduction(
        r.result.estimation?.annualEnergyNeeds,
        renovatedOf(r.result)?.annualEnergyNeeds,
      ),
  },
  {
    key: "systemBefore",
    header: "System energy before (kWh/year)",
    // Baseline scenario, not the step-1 estimation: this is the figure the
    // Financial service prices savings against, and the portfolio total in the
    // summary export sums this same basis.
    value: (r) => baselineScenarioOf(r.result)?.deliveredTotal,
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
    header: "ARV (EUR - Greek market model)",
    // The ARV model is trained on Greek property data only, so absolute prices
    // for other markets are extrapolations and are not exported. The relative
    // uplift below still carries an indicative signal.
    value: (r) =>
      getCountryCode(r.building.country) === "GR"
        ? r.result.financialResults?.afterRenovationValue
        : undefined,
  },
  {
    key: "arvUpliftPct",
    header: "ARV uplift (% - Greek market model)",
    value: (r) => r.result.financialResults?.arv?.priceIncreasePct,
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
    key: "annualMaintenance",
    header: "Annual maintenance cost (EUR/year)",
    value: (r) => r.result.financialResults?.annualMaintenanceCost,
  },
  {
    key: "co2Before",
    header: "Operational emissions before (t CO2e/year)",
    value: (r) => baselineScenarioOf(r.result)?.annualEmissionsTonCo2e,
  },
  {
    key: "co2After",
    header: "Operational emissions after (t CO2e/year)",
    value: (r) => renovatedOf(r.result)?.annualEmissionsTonCo2e,
  },
  {
    key: "embodiedCarbon",
    header: "Material carbon (kg CO2e)",
    value: (r) => renovatedOf(r.result)?.embodiedCarbonKgCo2e,
  },
  {
    key: "wholeLifeCarbon",
    header: "Whole-life carbon (kg CO2e)",
    value: (r) => {
      const renovated = renovatedOf(r.result);
      return computeLifetimeCarbonKgCo2e({
        embodiedCarbonKgCo2e: renovated?.embodiedCarbonKgCo2e,
        annualOperationalEmissionsTonCo2e: renovated?.annualEmissionsTonCo2e,
        projectLifetimeYears: r.projectLifetimeYears,
      });
    },
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
  projectLifetime: number,
): string {
  const rows = buildings
    .map((building) => {
      const result = results[building.id];
      if (!result) return null;
      return { building, result, projectLifetimeYears: projectLifetime };
    })
    .filter((row): row is BuildingExportRow => row !== null);
  return serializeCsv(rows, buildingExportColumns);
}

interface SummaryRow {
  metric: string;
  /** Nullish writes an empty cell, keeping an unavailable total distinct from a real zero. */
  value: string | number | null | undefined;
}

const summaryColumns: CsvColumn<SummaryRow>[] = [
  { key: "metric", header: "Metric", value: (r) => r.metric },
  { key: "value", header: "Value", value: (r) => r.value },
];

/** Portfolio aggregates as a Metric,Value table (same serializer). */
export function buildSummaryCsv(aggregate: PortfolioPackageAggregate): string {
  const { coverage } = aggregate;
  const rows: SummaryRow[] = [
    { metric: "Package", value: aggregate.packageId },
    { metric: "Total buildings", value: coverage.totalBuildings },
    { metric: "Buildings in totals", value: coverage.contributing },
    { metric: "Errors", value: coverage.errored },
    { metric: "Rejected", value: coverage.rejected },
    { metric: "Not costed", value: coverage.withoutPackage },
    { metric: "Total CAPEX (EUR)", value: aggregate.totalCapexEur },
    { metric: "Total NPV (EUR)", value: aggregate.totalNpvEur },
    {
      metric: "Total annual maintenance cost (EUR/year)",
      value: aggregate.totalAnnualMaintenanceEur,
    },
    {
      metric: "Portfolio ROI (ratio)",
      value: aggregate.portfolioRoi,
    },
    {
      metric: "Portfolio payback period (years)",
      value: aggregate.portfolioPaybackYears,
    },
    {
      metric: "Total thermal needs before (kWh/year)",
      value: aggregate.totalThermalNeedsBeforeKwh,
    },
    {
      metric: "Total thermal needs after (kWh/year)",
      value: aggregate.totalThermalNeedsAfterKwh,
    },
    {
      metric: "Total system energy before (kWh/year)",
      value: aggregate.totalDeliveredBeforeKwh,
    },
    {
      metric: "Total system energy after (kWh/year)",
      value: aggregate.totalDeliveredAfterKwh,
    },
    {
      metric: "Total operational emissions before (t CO2e/year)",
      value: aggregate.totalAnnualEmissionsBeforeTon,
    },
    {
      metric: "Total operational emissions after (t CO2e/year)",
      value: aggregate.totalAnnualEmissionsAfterTon,
    },
    {
      metric: "Total material carbon (t CO2e)",
      value: aggregate.totalEmbodiedCarbonTon,
    },
    {
      metric: "Total whole-life carbon (t CO2e)",
      value: aggregate.totalWholeLifeCarbonTon,
    },
    ...epcDistributionRows(aggregate),
  ];
  return serializeCsv(rows, summaryColumns);
}

/** One row per EPC class the portfolio occupies, before and after. */
function epcDistributionRows(
  aggregate: PortfolioPackageAggregate,
): SummaryRow[] {
  return occupiedEpcClasses(
    aggregate.epcCountsBefore,
    aggregate.epcCountsAfter,
  ).flatMap((epcClass) => [
    {
      metric: `EPC ${epcClass} before (buildings)`,
      value: aggregate.epcCountsBefore[epcClass] ?? 0,
    },
    {
      metric: `EPC ${epcClass} after (buildings)`,
      value: aggregate.epcCountsAfter[epcClass] ?? 0,
    },
  ]);
}
