/**
 * Shared adapter between the Financial API risk-assessment wire contract and
 * the frontend's internal domain shapes.
 *
 * The endpoint takes a `schemes` array and returns per-scheme results keyed by
 * `scheme_type`. Both wire consumers — `FinancialService` (HRA/PRA) and
 * `rseFinancialService` (RSE) — go through the two pure functions here so the
 * new-shape mapping lives in exactly one place.
 */

import type {
  RiskAssessmentResponse,
  SchemeInput,
  SchemeKpiHistogram,
} from "../types/financial";
import type {
  CashFlowData,
  FinancialChartMetadata,
  FinancialRiskIndicator,
  PercentileData,
  RiskAssessmentMetadata,
  RiskAssessmentPercentiles,
  RiskAssessmentPointForecasts,
} from "../types/renovation";

const RISK_INDICATORS: FinancialRiskIndicator[] = [
  "NPV",
  "IRR",
  "ROI",
  "PBP",
  "DPP",
];

const INDICATOR_AXIS_LABELS: Record<FinancialRiskIndicator, string> = {
  NPV: "Net present value (EUR)",
  IRR: "Internal rate of return",
  ROI: "Return on investment",
  PBP: "Payback period (years)",
  DPP: "Discounted payback (years)",
};

/** The scheme types the frontend currently emits. */
export type EmittedSchemeType = "equity" | "bank_loan";

/**
 * Build the request `schemes` array from the resolved loan inputs. A positive
 * loan amount selects a bank loan; otherwise the analysis is all-equity.
 */
export function buildSchemes(params: {
  loanAmount: number;
  loanTerm: number;
}): { schemes: SchemeInput[]; schemeType: EmittedSchemeType } {
  if (params.loanAmount > 0 && params.loanTerm > 0) {
    return {
      schemes: [
        {
          scheme_type: "bank_loan",
          loan_amount: Math.round(params.loanAmount),
          term_years: params.loanTerm,
        },
      ],
      schemeType: "bank_loan",
    };
  }
  return { schemes: [{ scheme_type: "equity" }], schemeType: "equity" };
}

/** Internal pieces produced from a single scheme's wire result. */
export interface MappedRiskResult {
  pointForecasts: RiskAssessmentPointForecasts;
  percentiles?: RiskAssessmentPercentiles;
  probabilities?: Record<string, number>;
  chartMetadata?: Partial<
    Record<FinancialRiskIndicator, FinancialChartMetadata>
  >;
  cashFlowData?: CashFlowData;
  metadata: Pick<
    RiskAssessmentMetadata,
    "n_sims" | "project_lifetime" | "capex"
  >;
}

/**
 * Map the wire response for a single requested scheme into the internal shape.
 * `schemeType` is the scheme we sent (so we read back the matching result);
 * `projectLifetime` is echoed into metadata.
 */
export function mapWireRiskResponse(
  response: RiskAssessmentResponse,
  params: { schemeType: string; projectLifetime: number },
): MappedRiskResult {
  const scheme = response.results[params.schemeType];
  if (!scheme) {
    throw new Error(
      `Risk-assessment response has no result for scheme "${params.schemeType}". ` +
        `Got: ${Object.keys(response.results).join(", ") || "none"}.`,
    );
  }

  const perc = scheme.summary.percentiles;
  const probabilities = scheme.summary.probabilities;
  const cashflow = scheme.cashflow_distributions;
  const netByYear = cashflow.cash_flows.P50 ?? [];
  const inflowByYear = cashflow.inflows.P50 ?? [];

  const pointForecasts: RiskAssessmentPointForecasts = {
    NPV: perc.NPV?.P50 ?? 0,
    IRR: perc.IRR?.P50 ?? 0,
    ROI: perc.ROI?.P50 ?? 0,
    PBP: perc.PBP?.P50 ?? 0,
    DPP: perc.DPP?.P50 ?? 0,
    // Derived: the new contract no longer returns these directly.
    MonthlyAvgSavings: meanOfYears(inflowByYear) / 12,
    SuccessRate: probabilities["Pr(NPV > 0)"] ?? 0,
  };

  return {
    pointForecasts,
    percentiles: mapPercentiles(perc),
    probabilities,
    chartMetadata: mapChartMetadata(scheme.kpi_histograms),
    cashFlowData: mapCashFlowData(
      cashflow.years,
      netByYear,
      inflowByYear,
      cashflow.outflows.P50 ?? [],
    ),
    metadata: {
      n_sims: scheme.summary.n_sims,
      project_lifetime: params.projectLifetime,
      capex: (response.metadata.capex as number | undefined) ?? 0,
    },
  };
}

/** Average over the project years (skip year 0, which has no savings). */
function meanOfYears(perYear: number[]): number {
  const years = perYear.slice(1);
  if (years.length === 0) return 0;
  return years.reduce((sum, v) => sum + v, 0) / years.length;
}

function mapPercentiles(
  perc: Record<string, { P10: number; P50: number; P90: number }>,
): RiskAssessmentPercentiles {
  const out: RiskAssessmentPercentiles = {};
  for (const indicator of RISK_INDICATORS) {
    const p = perc[indicator];
    if (!p) continue;
    const data: PercentileData = { P10: p.P10, P50: p.P50, P90: p.P90 };
    out[indicator] = data;
  }
  return out;
}

function mapChartMetadata(
  histograms: Record<string, SchemeKpiHistogram> | undefined,
): Partial<Record<FinancialRiskIndicator, FinancialChartMetadata>> | undefined {
  if (!histograms) return undefined;
  const out: Partial<Record<FinancialRiskIndicator, FinancialChartMetadata>> =
    {};
  for (const indicator of RISK_INDICATORS) {
    const h = histograms[indicator];
    if (!h) continue;
    const centers = binCenters(h.bin_edges);
    const counts = h.feasible_counts.map(
      (feasible, i) => feasible + (h.infeasible_counts[i] ?? 0),
    );
    out[indicator] = {
      bins: { centers, counts, edges: h.bin_edges },
      statistics: {
        ...weightedStats(centers, counts),
        P10: h.p10,
        P50: h.p50,
        P90: h.p90,
      },
      chart_config: {
        xlabel: INDICATOR_AXIS_LABELS[indicator],
        ylabel: "Frequency",
      },
    };
  }
  return out;
}

/** Midpoint of each consecutive edge pair. */
function binCenters(edges: number[]): number[] {
  const centers: number[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    centers.push((edges[i] + edges[i + 1]) / 2);
  }
  return centers;
}

/** Frequency-weighted mean and standard deviation across histogram bins. */
function weightedStats(
  centers: number[],
  counts: number[],
): { mean: number; std: number } {
  const total = counts.reduce((sum, c) => sum + c, 0);
  if (total === 0) return { mean: 0, std: 0 };
  const mean = centers.reduce((sum, c, i) => sum + c * counts[i], 0) / total;
  const variance =
    centers.reduce((sum, c, i) => sum + counts[i] * (c - mean) ** 2, 0) / total;
  return { mean, std: Math.sqrt(variance) };
}

function mapCashFlowData(
  years: number[],
  net: number[],
  inflows: number[],
  outflows: number[],
): CashFlowData {
  let running = 0;
  let breakevenYear: number | null = null;
  const cumulative = net.map((value, i) => {
    running += value;
    if (breakevenYear === null && i > 0 && running >= 0) breakevenYear = i;
    return running;
  });
  const year0 = net[0] ?? 0;
  return {
    years,
    initial_investment: year0 < 0 ? -year0 : 0,
    annual_inflows: inflows,
    annual_outflows: outflows,
    annual_net_cash_flow: net,
    cumulative_cash_flow: cumulative,
    breakeven_year: breakevenYear,
    loan_term: null,
  };
}
