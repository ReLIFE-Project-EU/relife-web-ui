import { afterEach, describe, expect, test, vi } from "vitest";

import {
  normalizeSystemSelection,
  getMeasureSelectionState,
} from "../../../src/services/measureNormalization";

describe("normalizeSystemSelection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("drops condensing boiler when heat pump is also selected", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      normalizeSystemSelection([
        "wall-insulation",
        "condensing-boiler",
        "air-water-heat-pump",
      ]),
    ).toEqual(["wall-insulation", "air-water-heat-pump"]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Dropping 'condensing-boiler' because it is mutually exclusive with 'air-water-heat-pump'",
    );
  });

  test("keeps single system selections unchanged", () => {
    expect(normalizeSystemSelection(["air-water-heat-pump"])).toEqual([
      "air-water-heat-pump",
    ]);
    expect(normalizeSystemSelection(["condensing-boiler"])).toEqual([
      "condensing-boiler",
    ]);
  });

  test("keeps selections without systems unchanged", () => {
    expect(normalizeSystemSelection(["wall-insulation", "pv"])).toEqual([
      "wall-insulation",
      "pv",
    ]);
  });
});

describe("measure selection state", () => {
  const eligible = [
    "condensing-boiler",
    "air-water-heat-pump",
    "wall-insulation",
  ] as const;

  test("blocks each alternative heating system", () => {
    expect(
      getMeasureSelectionState(
        "condensing-boiler",
        ["air-water-heat-pump"],
        eligible,
      ).disabled,
    ).toBe(true);
    expect(
      getMeasureSelectionState(
        "air-water-heat-pump",
        ["condensing-boiler"],
        eligible,
      ).disabled,
    ).toBe(true);
    expect(
      getMeasureSelectionState(
        "wall-insulation",
        ["condensing-boiler"],
        eligible,
      ).disabled,
    ).toBe(false);
  });

  test("allows deselection when an imported selection contains both heating systems", () => {
    const selected = ["condensing-boiler", "air-water-heat-pump"] as const;
    for (const id of selected)
      expect(getMeasureSelectionState(id, selected, eligible)).toMatchObject({
        isSelected: true,
        disabled: false,
      });
  });

  test("keeps unsupported measures disabled even when selected", () => {
    expect(getMeasureSelectionState("pv", ["pv"], eligible)).toMatchObject({
      isSelected: true,
      isAnalysisEligible: false,
      disabled: true,
    });
  });
});
