/**
 * Estimation validation: classify an EnergyService estimate as
 * "ok", "low-confidence", or "unusable" based on the archetype-matching
 * strategy and the area scale factor.
 *
 * Thresholds are named constants in this module — no env vars, no runtime
 * configuration. Tuning them is a domain conversation; this file is the
 * single touchpoint for that review.
 */

import {
  ArchetypeMatchStrategy,
  extractArchetypePeriod,
} from "./archetypeMatching";
import type { BuildingInfo, EstimationResult } from "../types/renovation";

export type EstimationConfidence = "ok" | "low-confidence" | "unusable";

export interface EstimationDiagnosticReason {
  code: string;
  message: string;
}

export interface EstimationDiagnostic {
  level: EstimationConfidence;
  reasons: EstimationDiagnosticReason[];
  strategy: ArchetypeMatchStrategy;
  areaScaleFactor: number;
  requested: { country: string; category: string; period?: string };
  chosen: { country: string; category: string; period?: string; name: string };
  remediation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds — review these constants together with domain stakeholders.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_OK_SCALE_FACTOR = 5.0;
const MAX_LOW_CONFIDENCE_SCALE_FACTOR = 10.0;

// ─────────────────────────────────────────────────────────────────────────────
// Per-strategy rules
// ─────────────────────────────────────────────────────────────────────────────

interface StrategyRule {
  level: EstimationConfidence;
  message: string;
  remediation: (country: string, category: string, period?: string) => string;
}

const STRATEGY_RULES: Record<ArchetypeMatchStrategy, StrategyRule> = {
  [ArchetypeMatchStrategy.USER_SELECTED]: {
    level: "ok",
    message: "Archetype selected explicitly by the user.",
    remediation: () => "",
  },
  [ArchetypeMatchStrategy.EXACT_FULL]: {
    level: "ok",
    message: "Exact match on country, category, and construction period.",
    remediation: () => "",
  },
  [ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH]: {
    level: "low-confidence",
    message: "Same country and category, but a different construction period.",
    remediation: (country, category, period) =>
      `No archetype exists for ${category}${period ? ` (${period})` : ""} in ${country}; an archetype from a different construction period was used.`,
  },
  [ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY]: {
    level: "unusable",
    message:
      "No archetype of the requested category was available; a different category in the same country was substituted.",
    remediation: (country, category, period) =>
      `No ${country} ${category} archetype is available${period ? ` (${period})` : ""}. Provide a custom building, change the building category, or remove this building from the portfolio.`,
  },
  [ArchetypeMatchStrategy.REGION_CATEGORY_MATCH]: {
    level: "low-confidence",
    message:
      "No archetype was available in the requested country; a matching category from a climate-region neighbour was substituted.",
    remediation: (country) =>
      `No ${country} archetype matches this building. The estimate uses a climate-region neighbour and may be less representative.`,
  },
  [ArchetypeMatchStrategy.REGION_ANY_MATCH]: {
    level: "unusable",
    message:
      "No archetype was available in the requested country or category; an arbitrary archetype from a climate-region neighbour was substituted.",
    remediation: (country, category, period) =>
      `No ${country} ${category} archetype is available${period ? ` (${period})` : ""}. Provide a custom building, change the building category, or remove this building from the portfolio.`,
  },
  [ArchetypeMatchStrategy.SELECTED_NOT_FOUND]: {
    level: "unusable",
    message:
      "The user-selected archetype is no longer present in the catalogue.",
    remediation: () => "Re-select an archetype from the current catalogue.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function validateEstimation(
  estimation: EstimationResult,
  building: BuildingInfo,
): EstimationDiagnostic {
  const archetype = estimation.archetype;
  const strategy =
    archetype?.matchStrategy ?? ArchetypeMatchStrategy.USER_SELECTED;
  const chosenPeriod = archetype
    ? extractArchetypePeriod(archetype.name)
    : undefined;
  const userArea = building.floorArea ?? 0;
  const archetypeArea = estimation.archetypeFloorArea || 0;
  const areaScaleFactor =
    archetypeArea > 0 && userArea > 0 ? userArea / archetypeArea : 1;

  const rule = STRATEGY_RULES[strategy];
  const reasons: EstimationDiagnosticReason[] = [];
  let level: EstimationConfidence = "ok";

  if (rule.level !== "ok") {
    level = rule.level;
    reasons.push({
      code:
        strategy === ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH
          ? "period-gap"
          : "strategy",
      message: rule.message,
    });
  }

  if (archetypeArea > 0 && userArea > 0) {
    const tooHigh = areaScaleFactor > MAX_LOW_CONFIDENCE_SCALE_FACTOR;
    const tooLow = areaScaleFactor < 1 / MAX_LOW_CONFIDENCE_SCALE_FACTOR;
    const outsideOk =
      areaScaleFactor > MAX_OK_SCALE_FACTOR ||
      areaScaleFactor < 1 / MAX_OK_SCALE_FACTOR;

    if (tooHigh || tooLow) {
      level = "unusable";
      reasons.push({
        code: "scale",
        message: `Area scale factor ${areaScaleFactor.toFixed(2)}× exceeds the unusable bound (${MAX_LOW_CONFIDENCE_SCALE_FACTOR}×). Linear scaling from the archetype distorts results too far.`,
      });
    } else if (outsideOk) {
      if (level === "ok") level = "low-confidence";
      reasons.push({
        code: "scale",
        message: `Area scale factor ${areaScaleFactor.toFixed(2)}× is outside the comfortable range (±${MAX_OK_SCALE_FACTOR}×). Results may be less representative.`,
      });
    }
  }

  const requested = {
    country: building.country,
    category: building.buildingType,
    period: building.constructionPeriod || undefined,
  };
  const chosen = {
    country: archetype?.country ?? building.country,
    category: archetype?.category ?? building.buildingType,
    period: chosenPeriod,
    name: archetype?.name ?? "(unknown)",
  };

  const remediation =
    level === "ok"
      ? ""
      : rule.remediation(
          requested.country,
          requested.category,
          requested.period,
        );

  return {
    level,
    reasons,
    strategy,
    areaScaleFactor,
    requested,
    chosen,
    remediation,
  };
}
