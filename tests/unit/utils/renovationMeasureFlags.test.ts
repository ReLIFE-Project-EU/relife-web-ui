import { describe, expect, test } from "vitest";
import {
  getEpcScenarioTooltipNotes,
  getRenovationMeasureFlags,
  renovationScenariosNeedEpcComparisonNote,
} from "../../../src/utils/renovationMeasureFlags";

describe("getRenovationMeasureFlags", () => {
  test("detects envelope, system, and PV", () => {
    expect(
      getRenovationMeasureFlags([
        "wall-insulation",
        "air-water-heat-pump",
        "pv",
      ]),
    ).toEqual({
      hasEnvelope: true,
      hasSystem: true,
      hasPv: true,
    });
  });

  test("detects system only", () => {
    expect(getRenovationMeasureFlags(["condensing-boiler"])).toEqual({
      hasEnvelope: false,
      hasSystem: true,
      hasPv: false,
    });
  });

  test("detects envelope only", () => {
    expect(getRenovationMeasureFlags(["windows", "roof-insulation"])).toEqual({
      hasEnvelope: true,
      hasSystem: false,
      hasPv: false,
    });
  });
});

describe("getEpcScenarioTooltipNotes", () => {
  test("returns system-only note without envelope", () => {
    const notes = getEpcScenarioTooltipNotes(
      getRenovationMeasureFlags(["air-water-heat-pump"]),
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("thermal needs per m²");
  });

  test("returns envelope+system note when both present", () => {
    const notes = getEpcScenarioTooltipNotes(
      getRenovationMeasureFlags(["wall-insulation", "condensing-boiler"]),
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("envelope changes");
  });

  test("appends PV note", () => {
    const notes = getEpcScenarioTooltipNotes(getRenovationMeasureFlags(["pv"]));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("Solar (PV)");
  });

  test("combines system and PV notes", () => {
    const notes = getEpcScenarioTooltipNotes(
      getRenovationMeasureFlags(["condensing-boiler", "pv"]),
    );
    expect(notes).toHaveLength(2);
  });
});

describe("renovationScenariosNeedEpcComparisonNote", () => {
  test("is true when any scenario has system or PV", () => {
    expect(
      renovationScenariosNeedEpcComparisonNote([
        { measureIds: ["wall-insulation"] },
        { measureIds: ["pv"] },
      ]),
    ).toBe(true);
  });

  test("is false for envelope-only scenarios", () => {
    expect(
      renovationScenariosNeedEpcComparisonNote([
        { measureIds: ["wall-insulation"] },
        { measureIds: ["windows"] },
      ]),
    ).toBe(false);
  });
});
