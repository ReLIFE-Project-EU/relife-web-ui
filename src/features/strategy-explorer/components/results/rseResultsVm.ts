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
import type { ConceptId } from "../../../../constants/relifeConcepts";
import type { RenovationMeasureId } from "../../../../types/renovation";
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
  label: string;
  formatter: (value: number) => string;
  conceptId?: ConceptId;
}

export const RANKING_COLUMNS: Record<
  RSERenovationGoal["kind"],
  RankingColumn[]
> = {
  financial: [
    {
      key: "renovatableBuildingsWithinBudget",
      label: "Buildings within budget",
      formatter: formatNumber,
      conceptId: "rse-renovatable-buildings",
    },
    {
      key: "aggregateROI",
      label: "Aggregate ROI",
      formatter: (v) => `${formatDecimal(v * 100)}%`,
      conceptId: "roi",
    },
    {
      key: "aggregateNPV",
      label: "Aggregate NPV",
      formatter: formatCurrency,
      conceptId: "npv",
    },
  ],
  energy: [
    {
      key: "energySavedPerEur",
      label: "System kWh saved / €",
      formatter: (v) => `${formatDecimal(v)} kWh/€`,
      conceptId: "rse-energy-saved-per-eur",
    },
    {
      key: "totalAnnualEnergySavingsKwh",
      label: "Total system savings",
      formatter: formatEnergy,
      conceptId: "rse-total-energy-savings",
    },
  ],
  emission: [
    {
      key: "co2ReducedTonPerEur",
      label: "kg CO₂ reduced / €",
      formatter: (v) => `${formatDecimal(v * 1000)} kg/€`,
      conceptId: "rse-co2-reduced-per-eur",
    },
    {
      key: "totalAnnualCo2ReductionTon",
      label: "Total CO₂ reduction",
      formatter: formatTonnageCo2,
      conceptId: "rse-total-co2-reduction",
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
      return agg.financialIndicators.aggregatePaybackYears;
    case "energySavedPerEur":
      return agg.energySavedPerEur;
    case "totalAnnualEnergySavingsKwh":
      return agg.totalAnnualEnergySavingsKwh;
    case "co2ReducedTonPerEur":
      return agg.co2ReducedTonPerEur;
    case "totalAnnualCo2ReductionTon":
      return agg.totalAnnualCo2ReductionTon;
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
  { label: string; conceptId?: ConceptId }
> = {
  energySavedPerEur: {
    label: "Energy saved per €",
    conceptId: "rse-energy-saved-per-eur",
  },
  totalAnnualEnergySavingsKwh: {
    label: "Total energy savings",
    conceptId: "rse-total-energy-savings",
  },
  co2ReducedTonPerEur: {
    label: "CO₂ reduced per €",
    conceptId: "rse-co2-reduced-per-eur",
  },
  totalAnnualCo2ReductionTon: {
    label: "Total CO₂ reduction",
    conceptId: "rse-total-co2-reduction",
  },
  renovatableBuildingsWithinBudget: {
    label: "Buildings within budget",
    conceptId: "rse-renovatable-buildings",
  },
  aggregateROI: { label: "Aggregate ROI", conceptId: "roi" },
  aggregateNPV: { label: "Aggregate NPV", conceptId: "npv" },
  aggregatePayback: {
    label: "Aggregate payback",
    conceptId: "payback-period",
  },
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
  label: string;
  value: string;
  hint?: string;
  conceptId?: ConceptId;
  icon: ComponentType<{ size?: number }>;
}

/** The three goal-dependent headline metrics shown on the hero card. */
export function heroMetricsFor(
  goal: RSERenovationGoal,
  agg: RSEPackageAggregate,
  horizonYears: number,
): HeroMetric[] {
  const investmentMetric: HeroMetric = {
    label: "Total investment",
    value: formatCurrency(agg.totalCapexEur),
    hint: "gross, before incentives",
    conceptId: "investment",
    icon: IconCash,
  };

  if (goal.kind === "energy") {
    return [
      {
        label: "Energy saved per €",
        value: `${formatDecimal(agg.energySavedPerEur)} kWh/€`,
        hint: "per euro invested",
        conceptId: "rse-energy-saved-per-eur",
        icon: IconBolt,
      },
      {
        label: "Total energy savings",
        value: formatEnergy(agg.totalAnnualEnergySavingsKwh),
        hint: "per year, across portfolio",
        conceptId: "rse-total-energy-savings",
        icon: IconChartBar,
      },
      investmentMetric,
    ];
  }

  if (goal.kind === "emission") {
    return [
      {
        label: "CO₂ reduced per €",
        value: `${formatDecimal(agg.co2ReducedTonPerEur * 1000)} kg/€`,
        hint: "per euro invested",
        conceptId: "rse-co2-reduced-per-eur",
        icon: IconLeaf,
      },
      {
        label: "Total CO₂ reduction",
        value: formatTonnageCo2(agg.totalAnnualCo2ReductionTon),
        hint: "per year, across portfolio",
        conceptId: "rse-total-co2-reduction",
        icon: IconChartBar,
      },
      investmentMetric,
    ];
  }

  const npv = agg.financialIndicators.aggregateNPV;
  const roi = agg.financialIndicators.aggregateROI;
  return [
    {
      label: "Buildings within budget",
      value:
        agg.renovatableBuildingsWithinBudget !== undefined
          ? formatNumber(agg.renovatableBuildingsWithinBudget)
          : "—",
      hint: "renovatable with this package",
      conceptId: "rse-renovatable-buildings",
      icon: IconBuildingCommunity,
    },
    {
      label: "Aggregate ROI",
      value: roi !== undefined ? `${formatDecimal(roi * 100)}%` : "—",
      hint: "across portfolio",
      conceptId: "roi",
      icon: IconTrendingUp,
    },
    {
      label: "Aggregate NPV",
      value: npv !== undefined ? formatCurrency(npv) : "—",
      hint: `over ${horizonYears} years`,
      conceptId: "npv",
      icon: IconCash,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Archetype keys
// ─────────────────────────────────────────────────────────────────────────────

const ARCHETYPE_KEY_SEPARATOR = "\u001f"; // mirrors RSE_KEY_SEPARATOR in services/rseKeys.ts

/** Decode the `country␟category␟name` key used by `perArchetypeOnly` maps. */
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
