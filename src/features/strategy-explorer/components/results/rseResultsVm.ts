/**
 * Presentation helpers for the RSE Results step: package colors, measure
 * labels, ranking-column configuration, score-component metadata, and
 * goal-dependent hero metric selection. Pure module — no React components.
 */

import type { ComponentType } from "react";
import type { BarChartProps } from "@mantine/charts";
import {
  IconBolt,
  IconBuildingCommunity,
  IconCash,
  IconChartBar,
  IconLeaf,
  IconTrendingUp,
} from "@tabler/icons-react";
import type {
  ConceptId,
  ConceptPrefix,
} from "../../../../constants/relifeConcepts";
import { formatMetricValue } from "../../../../services/appraisalReadout";
import type { RenovationMeasureId } from "../../../../types/renovation";
import { pooledPaybackYears } from "../../../../utils/financialCalculations";
import {
  formatCurrency,
  formatDecimal,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import type {
  RSEPackageAggregate,
  RSEPackageId,
  RSERenovationGoal,
} from "../../types";

/** Stable Mantine color per package; carried by dots, score bars, and tabs. */
export const PACKAGE_COLORS: Record<RSEPackageId, string> = {
  envelope: "teal",
  "systems-heat-pump": "blue",
  "systems-boiler": "orange",
  combined: "relife",
};

/**
 * Display names for renovation measures. The shared measure catalog lives in
 * the mock data layer (`src/services/mock/data/renovationMeasures.ts`), so
 * RSE keeps its own small label map instead of importing from mocks.
 */
export const RSE_MEASURE_LABELS: Record<RenovationMeasureId, string> = {
  "wall-insulation": "Wall insulation",
  "roof-insulation": "Roof insulation",
  "floor-insulation": "Floor insulation",
  windows: "Windows",
  "air-water-heat-pump": "Air-water heat pump",
  "condensing-boiler": "Condensing boiler",
  pv: "Solar PV",
  "solar-thermal": "Solar thermal",
};

// ─────────────────────────────────────────────────────────────────────────────
// Ranking table configuration (moved from ResultsStep)
// ─────────────────────────────────────────────────────────────────────────────

export interface RankingColumn {
  key: string;
  /** The shared concept the column reports; it supplies the header. */
  conceptId: ConceptId;
  prefix?: ConceptPrefix;
  formatter: (value: number) => string;
}

export const RANKING_COLUMNS: Record<
  RSERenovationGoal["kind"],
  RankingColumn[]
> = {
  financial: [
    {
      key: "renovatableBuildingsWithinBudget",
      conceptId: "rse-renovatable-buildings",
      formatter: formatNumber,
    },
    {
      key: "aggregateROI",
      conceptId: "roi",
      prefix: "Portfolio",
      formatter: (v) => formatMetricValue("ROI", v),
    },
    {
      key: "aggregateNPV",
      conceptId: "npv",
      prefix: "Total",
      formatter: (v) => formatMetricValue("NPV", v),
    },
  ],
  energy: [
    {
      key: "energySavedPerEur",
      conceptId: "rse-energy-saved-per-eur",
      formatter: (v) => `${formatDecimal(v)} kWh/€`,
    },
    {
      key: "totalAnnualEnergySavingsKwh",
      conceptId: "rse-total-energy-savings",
      formatter: formatEnergy,
    },
  ],
  emission: [
    {
      key: "co2ReducedTonPerEur",
      conceptId: "rse-co2-reduced-per-eur",
      formatter: (v) => `${formatDecimal(v * 1000)} kg/€`,
    },
    {
      key: "totalAnnualCo2ReductionTon",
      conceptId: "rse-total-co2-reduction",
      formatter: formatTonnageCo2,
    },
  ],
};

export function getAggregateValue(
  agg: RSEPackageAggregate,
  key: string,
): number | undefined {
  switch (key) {
    case "renovatableBuildingsWithinBudget":
      return agg.renovatableBuildingsWithinBudget;
    case "aggregateROI":
      return agg.financialIndicators.aggregateROI;
    case "aggregateNPV":
      return agg.financialIndicators.aggregateNPV;
    case "aggregatePaybackYears":
      return pooledPaybackYears(agg.financialIndicators.aggregatePayback);
    case "energySavedPerEur":
      return agg.energySavedPerEur;
    case "totalAnnualEnergySavingsKwh":
      return agg.totalAnnualEnergySavingsKwh;
    case "co2ReducedTonPerEur":
      return agg.co2ReducedTonPerEur;
    case "totalAnnualCo2ReductionTon":
      return agg.totalAnnualCo2ReductionTon;
    case "totalEmbodiedCarbonTon":
      return agg.totalEmbodiedCarbonTon;
    case "totalWholeLifeCarbonTon":
      return agg.totalWholeLifeCarbonTon;
    case "totalBuildings":
      return agg.totalBuildings;
    case "totalCapexEur":
      return agg.totalCapexEur;
    case "totalEffectiveCapexEur":
      return agg.totalEffectiveCapexEur;
    default:
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Score components ("why this ranking")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata for the weighted, normalized score components produced by
 * `rankPackages` (`rseRankingService.ts`). Keys must match the metric keys
 * used there.
 */
export const SCORE_COMPONENT_META: Record<
  string,
  { conceptId: ConceptId; prefix?: ConceptPrefix }
> = {
  energySavedPerEur: { conceptId: "rse-energy-saved-per-eur" },
  totalAnnualEnergySavingsKwh: { conceptId: "rse-total-energy-savings" },
  co2ReducedTonPerEur: { conceptId: "rse-co2-reduced-per-eur" },
  totalAnnualCo2ReductionTon: { conceptId: "rse-total-co2-reduction" },
  renovatableBuildingsWithinBudget: { conceptId: "rse-renovatable-buildings" },
  aggregateROI: { conceptId: "roi", prefix: "Portfolio" },
  aggregateNPV: { conceptId: "npv", prefix: "Total" },
  aggregatePayback: { conceptId: "payback-period", prefix: "Portfolio" },
};

export const RSE_CHART_TOOLTIP_PROPS = {
  allowEscapeViewBox: { x: true, y: true },
  cursor: {
    fill: "var(--mantine-color-relife-0)",
    stroke: "var(--mantine-color-relife-3)",
    strokeDasharray: "4 4",
    strokeWidth: 1,
  },
  offset: 12,
  wrapperStyle: {
    pointerEvents: "none",
    zIndex: 40,
  },
} satisfies NonNullable<BarChartProps["tooltipProps"]>;

/** Room for package labels on horizontal (orientation=vertical) bar charts. */
export const RSE_CHART_Y_AXIS_PROPS = {
  width: 150,
} satisfies NonNullable<BarChartProps["yAxisProps"]>;

// ─────────────────────────────────────────────────────────────────────────────
// Goal display and hero metrics
// ─────────────────────────────────────────────────────────────────────────────

export const GOAL_DISPLAY: Record<
  RSERenovationGoal["kind"],
  { label: string; icon: ComponentType<{ size?: number }> }
> = {
  financial: { label: "Financial", icon: IconCash },
  energy: { label: "Energy efficiency", icon: IconBolt },
  emission: { label: "Emission reduction", icon: IconLeaf },
};

export interface HeroMetric {
  /** The shared concept the tile reports; it supplies the name and explainer. */
  conceptId: ConceptId;
  prefix?: ConceptPrefix;
  value: string;
  hint?: string;
  icon: ComponentType<{ size?: number }>;
}

/** The three goal-dependent headline metrics shown on the hero card. */
export function heroMetricsFor(
  goal: RSERenovationGoal,
  agg: RSEPackageAggregate,
  lifetimeYears: number,
): HeroMetric[] {
  const investmentMetric: HeroMetric = {
    conceptId: "investment",
    prefix: "Total",
    value: formatCurrency(agg.totalCapexEur),
    hint: "gross, before incentives",
    icon: IconCash,
  };

  if (goal.kind === "energy") {
    return [
      {
        conceptId: "rse-energy-saved-per-eur",
        value: `${formatDecimal(agg.energySavedPerEur)} kWh/€`,
        icon: IconBolt,
      },
      {
        conceptId: "rse-total-energy-savings",
        value: formatEnergy(agg.totalAnnualEnergySavingsKwh),
        icon: IconChartBar,
      },
      investmentMetric,
    ];
  }

  if (goal.kind === "emission") {
    return [
      {
        conceptId: "rse-co2-reduced-per-eur",
        value: `${formatDecimal(agg.co2ReducedTonPerEur * 1000)} kg/€`,
        icon: IconLeaf,
      },
      {
        conceptId: "rse-total-co2-reduction",
        value: formatTonnageCo2(agg.totalAnnualCo2ReductionTon),
        icon: IconChartBar,
      },
      investmentMetric,
    ];
  }

  const npv = agg.financialIndicators.aggregateNPV;
  const roi = agg.financialIndicators.aggregateROI;
  return [
    {
      conceptId: "rse-renovatable-buildings",
      value:
        agg.renovatableBuildingsWithinBudget !== undefined
          ? formatNumber(agg.renovatableBuildingsWithinBudget)
          : "—",
      icon: IconBuildingCommunity,
    },
    {
      conceptId: "roi",
      prefix: "Portfolio",
      value: roi !== undefined ? formatMetricValue("ROI", roi) : "—",
      icon: IconTrendingUp,
    },
    {
      conceptId: "npv",
      prefix: "Total",
      value: npv !== undefined ? formatMetricValue("NPV", npv) : "—",
      hint: `over ${lifetimeYears} years`,
      icon: IconCash,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Archetype keys
// ─────────────────────────────────────────────────────────────────────────────

const ARCHETYPE_KEY_SEPARATOR = "\u001f"; // mirrors RSE_KEY_SEPARATOR in services/rseKeys.ts

/** Decode the `country␟category␟name` key used by `perArchetypeAppraisals`. */
export function decodeArchetypeKey(key: string): {
  country: string;
  category: string;
  name: string;
} {
  const [country = "", category = "", name = ""] = key.split(
    ARCHETYPE_KEY_SEPARATOR,
  );
  return { country, category, name };
}
