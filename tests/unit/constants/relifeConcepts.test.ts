import { describe, expect, test } from "vitest";
import {
  hraResultMetricConceptIds,
  measureEffectProfiles,
  praResultMetricConceptIds,
  relifeConcepts,
  supportedRenovationMeasureIds,
} from "../../../src/constants/relifeConcepts";
import { RENOVATION_MEASURES } from "../../../src/services/mock/data/renovationMeasures";

describe("relifeConcepts ontology", () => {
  test("every renovation measure has exactly one effect profile", () => {
    const measureIds = RENOVATION_MEASURES.map((measure) => measure.id).sort();
    const profileIds = Object.values(measureEffectProfiles)
      .map((profile) => profile.measureId)
      .sort();

    expect(profileIds).toEqual(measureIds);
    expect(new Set(profileIds).size).toBe(profileIds.length);
    expect([...supportedRenovationMeasureIds].sort()).toEqual(measureIds);
  });

  test("every HRA and PRA result metric maps to a concept entry", () => {
    const mappedConceptIds = [
      ...hraResultMetricConceptIds,
      ...praResultMetricConceptIds,
    ];

    for (const conceptId of mappedConceptIds) {
      expect(relifeConcepts[conceptId]).toBeDefined();
    }
  });

  test("HRA-required concepts include labels, descriptions, and applicable units", () => {
    const unitRequiredConcepts = [
      "annual-building-thermal-needs",
      "system-energy-consumption",
      "energy-intensity",
      "estimated-thermal-needs-cost",
      "investment",
      "npv",
      "payback-period",
      "monthly-cash-benefit",
      "success-probability",
      "ranking-score",
    ] as const;

    for (const conceptId of hraResultMetricConceptIds) {
      const concept = relifeConcepts[conceptId];
      expect(concept.label.trim()).not.toBe("");
      expect(concept.description.trim()).not.toBe("");
    }

    for (const conceptId of unitRequiredConcepts) {
      expect(relifeConcepts[conceptId].unit?.trim()).not.toBe("");
    }
  });
});
