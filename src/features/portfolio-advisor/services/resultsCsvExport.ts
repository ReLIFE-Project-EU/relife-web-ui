/** PRA exports: raw values with units in headers; special readings match the UI. */

import {
  prefixedConceptLabel,
  relifeConcepts,
  type ConceptId,
  type ConceptPrefix,
} from "../../../constants/relifeConcepts";
import { serializeCsv, type CsvColumn } from "../../../utils/csvExport";
import { getEnergyReduction } from "../../../utils/formatters";
import { getCountryCode } from "../../../utils/countries";
import { computeLifetimeCarbonKgCo2e } from "../../../services/carrierSavingsService";
import {
  readMetric,
  readPooledPayback,
  readingCsvValue,
  type AppraisalMetric,
} from "../../../services/appraisalReadout";
import {
  resolveSavingsAvailability,
  savingsAvailabilityLabel,
} from "../../../services/savingsState";
import { UNFINISHED_BUILDING_STATUS_LABEL } from "../constants";
import type { PortfolioPackageAggregate } from "./portfolioAggregation";
import { baselineScenarioOf, renovatedOf } from "./scenarioLookup";
import type { BuildingAnalysisResult, PRABuilding } from "../context/types";

interface BuildingExportRow {
  building: PRABuilding;
  result: BuildingAnalysisResult;
  projectLifetimeYears: number;
}

/** Header: concept name, optional prefix and before/after, unit of the written value. */
function metricHeader(
  conceptId: ConceptId,
  options: { prefix?: ConceptPrefix; qualifier?: string; unit?: string } = {},
): string {
  const name = prefixedConceptLabel(conceptId, options.prefix);
  const qualified = options.qualifier ? `${name} ${options.qualifier}` : name;
  return `${qualified} (${options.unit ?? relifeConcepts[conceptId].unit})`;
}

const appraisalCell = (metric: AppraisalMetric) => (r: BuildingExportRow) =>
  readingCsvValue(readMetric(r.result.financialResults?.appraisal, metric));

/** Match lifetime-dependent Financial keys such as "Pr(PBP < 20y)" by prefix. */
function probabilityByPrefix(
  result: BuildingAnalysisResult,
  prefix: string,
): number | undefined {
  const probabilities = result.financialResults?.probabilities;
  if (!probabilities) return undefined;
  const key = Object.keys(probabilities).find((k) => k.startsWith(prefix));
  return key ? probabilities[key] : undefined;
}

/** Use the same status labels as the UI. */
function statusLabel({ result }: BuildingExportRow): string {
  if (result.status !== "success") {
    return UNFINISHED_BUILDING_STATUS_LABEL[result.status];
  }
  return savingsAvailabilityLabel[
    resolveSavingsAvailability(renovatedOf(result), result.financialResults)
  ];
}

export const buildingExportColumns: CsvColumn<BuildingExportRow>[] = [
  { key: "name", header: "Building", value: (r) => r.building.name },
  { key: "status", header: "Status", value: statusLabel },
  { key: "country", header: "Country", value: (r) => r.building.country },
  { key: "category", header: "Category", value: (r) => r.building.category },
  {
    key: "floorArea",
    header: relifeConcepts["total-floor-area"].label,
    value: (r) => r.building.floorArea,
  },
  {
    key: "thermalBefore",
    header: metricHeader("annual-building-thermal-needs", {
      qualifier: "before",
    }),
    value: (r) => r.result.estimation?.baseline.thermalNeed,
  },
  {
    key: "thermalAfter",
    header: metricHeader("annual-building-thermal-needs", {
      qualifier: "after",
    }),
    value: (r) => renovatedOf(r.result)?.annualEnergyNeeds,
  },
  {
    key: "energyReduction",
    header: metricHeader("annual-building-thermal-needs", {
      prefix: "Reduction in",
      unit: "%",
    }),
    value: (r) =>
      getEnergyReduction(
        r.result.estimation?.baseline.thermalNeed,
        renovatedOf(r.result)?.annualEnergyNeeds,
      ),
  },
  {
    key: "systemBefore",
    header: metricHeader("system-energy-consumption", { qualifier: "before" }),
    // Use the scenario baseline priced by Financial and summed in portfolio totals.
    value: (r) => baselineScenarioOf(r.result)?.deliveredTotal,
  },
  {
    key: "systemAfter",
    header: metricHeader("system-energy-consumption", { qualifier: "after" }),
    value: (r) => renovatedOf(r.result)?.deliveredTotal,
  },
  {
    key: "capex",
    header: metricHeader("investment"),
    value: (r) => r.result.financialResults?.capitalExpenditure,
  },
  {
    key: "costSource",
    header: "Cost source",
    // Report lookup/override provenance per resolved cost; blank if unresolved.
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
    header: metricHeader("arv", { unit: "EUR - Greek market model" }),
    // Absolute ARV is Greek-only; relative uplift remains indicative elsewhere.
    value: (r) =>
      getCountryCode(r.building.country) === "GR"
        ? r.result.financialResults?.afterRenovationValue
        : undefined,
  },
  {
    key: "arvUpliftPct",
    header: metricHeader("arv", {
      prefix: "Uplift in",
      unit: "% - Greek market model",
    }),
    value: (r) => r.result.financialResults?.arv?.priceIncreasePct,
  },
  {
    key: "npv",
    header: metricHeader("npv"),
    value: appraisalCell("NPV"),
  },
  {
    key: "roi",
    header: metricHeader("roi", { unit: "ratio" }),
    value: appraisalCell("ROI"),
  },
  {
    key: "irr",
    header: metricHeader("irr", { unit: "ratio" }),
    value: appraisalCell("IRR"),
  },
  {
    key: "pbp",
    header: metricHeader("payback-period"),
    value: appraisalCell("PBP"),
  },
  {
    key: "dpp",
    header: metricHeader("discounted-payback-period"),
    value: appraisalCell("DPP"),
  },
  {
    key: "annualMaintenance",
    header: metricHeader("annual-maintenance-cost"),
    value: (r) => r.result.financialResults?.annualMaintenanceCost,
  },
  {
    key: "co2Before",
    header: metricHeader("operational-co2-emissions", { qualifier: "before" }),
    value: (r) => baselineScenarioOf(r.result)?.annualEmissionsTonCo2e,
  },
  {
    key: "co2After",
    header: metricHeader("operational-co2-emissions", { qualifier: "after" }),
    value: (r) => renovatedOf(r.result)?.annualEmissionsTonCo2e,
  },
  {
    key: "embodiedCarbon",
    header: metricHeader("embodied-carbon", { unit: "kg CO₂e" }),
    value: (r) => renovatedOf(r.result)?.embodiedCarbonKgCo2e,
  },
  {
    key: "wholeLifeCarbon",
    header: metricHeader("whole-life-carbon", { unit: "kg CO₂e" }),
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
    header: metricHeader("success-probability", { unit: "ratio" }),
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
  value: string | number | null | undefined;
}

const summaryColumns: CsvColumn<SummaryRow>[] = [
  { key: "metric", header: "Metric", value: (r) => r.metric },
  { key: "value", header: "Value", value: (r) => r.value },
];

/** Portfolio aggregates as a Metric,Value table. Nullish totals stay blank. */
export function buildSummaryCsv(aggregate: PortfolioPackageAggregate): string {
  const { coverage } = aggregate;
  const metric = (
    concept: ConceptId,
    value: SummaryRow["value"],
    options?: Parameters<typeof metricHeader>[1],
  ): SummaryRow => ({
    metric: metricHeader(concept, { prefix: "Total", ...options }),
    value,
  });
  const rows: SummaryRow[] = [
    { metric: "Package", value: aggregate.packageId },
    { metric: "Total buildings", value: coverage.totalBuildings },
    { metric: "Buildings in totals", value: coverage.contributing },
    { metric: "Errors", value: coverage.errored },
    { metric: "Rejected", value: coverage.rejected },
    { metric: "Not costed", value: coverage.withoutPackage },
    metric("investment", aggregate.totalCapexEur),
    metric("npv", aggregate.totalNpvEur),
    metric("annual-maintenance-cost", aggregate.totalAnnualMaintenanceEur),
    metric("roi", aggregate.portfolioRoi, {
      prefix: "Portfolio",
      unit: "ratio",
    }),
    metric(
      "payback-period",
      readingCsvValue(readPooledPayback(aggregate.portfolioPayback)),
      { prefix: "Portfolio" },
    ),
    metric(
      "annual-building-thermal-needs",
      aggregate.totalThermalNeedsBeforeKwh,
      { qualifier: "before" },
    ),
    metric(
      "annual-building-thermal-needs",
      aggregate.totalThermalNeedsAfterKwh,
      { qualifier: "after" },
    ),
    metric("system-energy-consumption", aggregate.totalDeliveredBeforeKwh, {
      qualifier: "before",
    }),
    metric("system-energy-consumption", aggregate.totalDeliveredAfterKwh, {
      qualifier: "after",
    }),
    metric(
      "operational-co2-emissions",
      aggregate.totalAnnualEmissionsBeforeTon,
      { qualifier: "before" },
    ),
    metric(
      "operational-co2-emissions",
      aggregate.totalAnnualEmissionsAfterTon,
      { qualifier: "after" },
    ),
    metric("embodied-carbon", aggregate.totalEmbodiedCarbonTon),
    metric("whole-life-carbon", aggregate.totalWholeLifeCarbonTon),
  ];
  return serializeCsv(rows, summaryColumns);
}
