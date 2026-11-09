import { describe, expect, test } from "vitest";
import {
  measureEffectProfiles,
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
});
