import { afterEach, describe, expect, test, vi } from "vitest";

import { normalizeSystemSelection } from "../../../src/services/measureNormalization";

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
