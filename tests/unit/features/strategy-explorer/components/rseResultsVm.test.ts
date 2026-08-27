import { describe, expect, test } from "vitest";
import {
  decodeArchetypeKey,
  getAggregateValue,
} from "../../../../../src/features/strategy-explorer/components/results/rseResultsVm";
import type { RSEPackageAggregate } from "../../../../../src/features/strategy-explorer/types";
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
  // A missing case here is silent: the column renders "—" on every row with no
  // error, and RankingColumn.key is a plain string so TypeScript cannot help.
  test("resolves both carbon columns", () => {
    const agg = {
      totalEmbodiedCarbonTon: 36,
      totalWholeLifeCarbonTon: 162,
    } as RSEPackageAggregate;

    expect(getAggregateValue(agg, "totalEmbodiedCarbonTon")).toBe(36);
    expect(getAggregateValue(agg, "totalWholeLifeCarbonTon")).toBe(162);
  });
});
