import { describe, expect, test } from "vitest";

import {
  ArchetypeMatchStrategy,
  extractArchetypePeriod,
} from "../../../src/services/archetypeMatching";

describe("extractArchetypePeriod", () => {
  test("parses the standard SFH_<country>_YYYY_YYYY pattern", () => {
    expect(extractArchetypePeriod("SFH_Greece_1946_1969")).toBe("1946-1969");
    expect(extractArchetypePeriod("SFH_Italy_1946_1969")).toBe("1946-1969");
  });

  test("parses the ES_SFH_YYYY_YYYY pattern", () => {
    expect(extractArchetypePeriod("ES_SFH_1946_1969")).toBe("1946-1969");
  });

  test("returns undefined when no period suffix is present", () => {
    expect(extractArchetypePeriod("Custom_Building_XYZ")).toBeUndefined();
    expect(extractArchetypePeriod("SFH_Greece")).toBeUndefined();
  });

  test("does not match three-digit or longer numbers", () => {
    expect(extractArchetypePeriod("SFH_Country_19460_19690")).toBeUndefined();
  });
});

describe("ArchetypeMatchStrategy", () => {
  test("exposes stable string values used by the audit log", () => {
    expect(ArchetypeMatchStrategy.USER_SELECTED).toBe("user-selected");
    expect(ArchetypeMatchStrategy.EXACT_FULL).toBe("exact-full");
    expect(ArchetypeMatchStrategy.EXACT_CATEGORY_PERIOD_MISMATCH).toBe(
      "exact-category-period-mismatch",
    );
    expect(ArchetypeMatchStrategy.COUNTRY_ANY_CATEGORY).toBe(
      "country-any-category",
    );
    expect(ArchetypeMatchStrategy.REGION_CATEGORY_MATCH).toBe(
      "region-category-match",
    );
    expect(ArchetypeMatchStrategy.REGION_ANY_MATCH).toBe("region-any-match");
    expect(ArchetypeMatchStrategy.SELECTED_NOT_FOUND).toBe(
      "selected-not-found",
    );
  });
});
