import { describe, expect, test } from "vitest";
import {
  buildArchetypeSelectionLabels,
  compareArchetypesForSelection,
  formatArchetypeSelectionLabel,
  getArchetypeSelectionLabel,
} from "../../../src/utils/archetypeLabels";

describe("archetypeLabels", () => {
  describe("formatArchetypeSelectionLabel", () => {
    test("prefixes the canonical country for legacy Austrian archetypes", () => {
      expect(formatArchetypeSelectionLabel("Austria", "SFH_0_1945")).toBe(
        "Austria · Single-Family House · Pre-1945",
      );
    });

    test("does not duplicate country when the archetype name already includes it", () => {
      expect(formatArchetypeSelectionLabel("Greece", "GR_SFH_1946_1969")).toBe(
        "Greece · Single-Family House · 1946–1969",
      );
    });

    test("normalizes country aliases before rendering the label", () => {
      expect(
        formatArchetypeSelectionLabel("Czech Republic", "SFH_0_1945"),
      ).toBe("Czechia · Single-Family House · Pre-1945");
    });
  });

  describe("compareArchetypesForSelection", () => {
    test("sorts by country, then chronological period, then label", () => {
      const archetypes = [
        { country: "Austria", name: "AT_SFH_1971_1990" },
        { country: "Austria", name: "SFH_0_1945" },
        { country: "Belgium", name: "BE_SFH_1946_1969" },
      ];

      archetypes.sort(compareArchetypesForSelection);

      expect(archetypes).toEqual([
        { country: "Austria", name: "SFH_0_1945" },
        { country: "Austria", name: "AT_SFH_1971_1990" },
        { country: "Belgium", name: "BE_SFH_1946_1969" },
      ]);
    });

    test("uses the raw name as a stable tiebreaker for duplicate friendly labels", () => {
      const archetypes = [
        { country: "Austria", name: "SFH_0_1945" },
        { country: "Austria", name: "AT_SFH_0_1945" },
      ];

      archetypes.sort(compareArchetypesForSelection);

      expect(archetypes).toEqual([
        { country: "Austria", name: "AT_SFH_0_1945" },
        { country: "Austria", name: "SFH_0_1945" },
      ]);
    });
  });

  describe("duplicate-aware selection labels", () => {
    test("keeps the friendly label when it is unique", () => {
      const labels = buildArchetypeSelectionLabels([
        { country: "Austria", name: "SFH_0_1945" },
      ]);

      expect(
        getArchetypeSelectionLabel(
          { country: "Austria", name: "SFH_0_1945" },
          labels,
        ),
      ).toBe("Austria · Single-Family House · Pre-1945");
    });

    test("appends the raw archetype name only for duplicate friendly labels", () => {
      const labels = buildArchetypeSelectionLabels([
        { country: "Austria", name: "AT_SFH_0_1945" },
        { country: "Austria", name: "SFH_0_1945" },
        { country: "Belgium", name: "BE_SFH_1946_1969" },
      ]);

      expect(
        getArchetypeSelectionLabel(
          { country: "Austria", name: "AT_SFH_0_1945" },
          labels,
        ),
      ).toBe("Austria · Single-Family House · Pre-1945 (AT_SFH_0_1945)");
      expect(
        getArchetypeSelectionLabel(
          { country: "Austria", name: "SFH_0_1945" },
          labels,
        ),
      ).toBe("Austria · Single-Family House · Pre-1945 (SFH_0_1945)");
      expect(
        getArchetypeSelectionLabel(
          { country: "Belgium", name: "BE_SFH_1946_1969" },
          labels,
        ),
      ).toBe("Belgium · Single-Family House · 1946–1969");
    });
  });
});
