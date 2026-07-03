import { describe, expect, test } from "vitest";

import { ArchetypeMatchStrategy } from "../../../src/services/archetypeMatching";

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
