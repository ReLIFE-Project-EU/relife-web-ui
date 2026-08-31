import { describe, expect, test } from "vitest";
import {
  measureEffectProfiles,
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

  test("every concept has a label and description, and units where applicable", () => {
    const unitRequiredConcepts = [
      "annual-building-thermal-needs",
      "system-energy-consumption",
      "energy-intensity",
      "investment",
      "npv",
      "payback-period",
      "monthly-cash-benefit",
      "success-probability",
      "ranking-score",
    ] as const;

    for (const concept of Object.values(relifeConcepts)) {
      expect(concept.label.trim()).not.toBe("");
      expect(concept.description.trim()).not.toBe("");
    }

    for (const conceptId of unitRequiredConcepts) {
      expect(relifeConcepts[conceptId].unit?.trim()).toBeTruthy();
    }
  });

  test("financing scheme concepts are shared across the tools", () => {
    // The financing vocabulary is defined once here so HRA and PRA cannot
    // drift apart (issue #72). The loan and subsidy caveats are rendered as
    // visible copy, so they must be present.
    expect(relifeConcepts["own-funds"].label.trim()).toBeTruthy();
    expect(relifeConcepts["renovation-loan"].caveat?.trim()).toBeTruthy();
    expect(relifeConcepts["upfront-subsidy"].caveat?.trim()).toBeTruthy();
  });
});
