import { describe, expect, test } from "vitest";
import { decodeArchetypeKey } from "../../../../../src/features/strategy-explorer/components/results/rseResultsVm";
import { rseArchetypeKey } from "../../../../../src/features/strategy-explorer/services/rseKeys";

describe("rseResultsVm", () => {
  test("decodes archetype keys produced by rseArchetypeKey", () => {
    const key = rseArchetypeKey({
      country: "IT",
      category: "Residential",
      name: "Detached pre-1980",
    });

    expect(decodeArchetypeKey(key)).toEqual({
      country: "IT",
      category: "Residential",
      name: "Detached pre-1980",
    });
  });
});
