import { describe, test, expect } from "vitest";
import {
  toAPIPropertyType,
  fromAPIPropertyType,
  toAPIEnergyClass,
  fromAPIEnergyClass,
  deriveConstructionYear,
  deriveConstructionPeriod,
  PROPERTY_TYPE_TO_API,
  PROPERTY_TYPE_FROM_API,
  EPC_CLASS_TO_API,
  EPC_CLASS_FROM_API,
  CONSTRUCTION_PERIOD_TO_YEAR,
  type APIPropertyType,
  type APIEnergyClass,
} from "../../../src/utils/apiMappings";

describe("apiMappings", () => {
  // ── Property Type ──────────────────────────────────────────────────────────

  describe("toAPIPropertyType", () => {
    test.each([
      ["apartment", "Apartment"],
      ["detached", "Detached House"],
      ["semi-detached", "Maisonette"],
      ["terraced", "Building"],
    ] as const)("maps UI type %s → API %s", (ui, expected) => {
      expect(toAPIPropertyType(ui)).toBe(expected);
    });

    test("returns 'Other' for unknown UI types", () => {
      expect(toAPIPropertyType("unknown")).toBe("Other");
    });
  });

  describe("fromAPIPropertyType", () => {
    test.each([
      ["Apartment", "apartment"],
      ["Detached House", "detached"],
      ["Maisonette", "semi-detached"],
      ["Building", "terraced"],
      ["Loft", "apartment"],
      ["Studio / Bedsit", "apartment"],
      ["Villa", "detached"],
      ["Other", "detached"],
      ["Apartment Complex", "apartment"],
    ] as const)("maps API type %s → UI %s", (api, expected) => {
      expect(fromAPIPropertyType(api)).toBe(expected);
    });

    test("returns 'detached' for unknown API types", () => {
      expect(fromAPIPropertyType("NonExistent" as APIPropertyType)).toBe(
        "detached"
      );
    });
  });

  describe("property type round-trip", () => {
    test.each(["apartment", "detached", "semi-detached", "terraced"])(
      "UI→API→UI is identity for %s",
      (uiType) => {
        const apiType = toAPIPropertyType(uiType);
        expect(fromAPIPropertyType(apiType)).toBe(uiType);
      }
    );
  });

  // ── EPC Class ──────────────────────────────────────────────────────────────

  describe("toAPIEnergyClass", () => {
    test.each([
      ["G", "\u0397"],
      ["F", "\u0396"],
      ["E", "\u0395"],
      ["D", "\u0394"],
      ["C", "\u0393"],
      ["B", "\u0392"],
      ["B+", "\u0392+"],
      ["A", "\u0391"],
      ["A+", "\u0391+"],
    ] as const)("maps UI class %s → API Greek char", (ui, expected) => {
      expect(toAPIEnergyClass(ui)).toBe(expected);
    });

    test("returns Greek D (Δ) for unknown UI classes", () => {
      expect(toAPIEnergyClass("Z")).toBe("\u0394");
    });
  });

  describe("fromAPIEnergyClass", () => {
    test.each([
      ["\u0397", "G"],
      ["\u0396", "F"],
      ["\u0395", "E"],
      ["\u0394", "D"],
      ["\u0393", "C"],
      ["\u0392", "B"],
      ["\u0392+", "B+"],
      ["\u0391", "A"],
      ["\u0391+", "A+"],
    ] as const)("maps API Greek char %s → UI class %s", (api, expected) => {
      expect(fromAPIEnergyClass(api)).toBe(expected);
    });

    test("returns 'D' for unknown API energy classes", () => {
      expect(fromAPIEnergyClass("X" as APIEnergyClass)).toBe("D");
    });
  });

  describe("EPC class round-trip", () => {
    test.each(["G", "F", "E", "D", "C", "B", "B+", "A", "A+"])(
      "UI→API→UI is identity for %s",
      (uiClass) => {
        const apiClass = toAPIEnergyClass(uiClass);
        expect(fromAPIEnergyClass(apiClass)).toBe(uiClass);
      }
    );
  });

  // ── Construction Year / Period ─────────────────────────────────────────────

  describe("deriveConstructionYear", () => {
    test("returns 1958 for known period '1945-1970'", () => {
      expect(deriveConstructionYear("1945-1970")).toBe(1958);
    });

    test("computes midpoint 1958 for archetype-derived '1946-1969'", () => {
      expect(deriveConstructionYear("1946-1969")).toBe(1958);
    });

    test.each([
      ["pre-1945", 1930],
      ["post-2010", 2018],
    ] as const)(
      "returns %i for special period '%s'",
      (period, expected) => {
        expect(deriveConstructionYear(period)).toBe(expected);
      }
    );

    test("returns 1980 for unknown period strings", () => {
      expect(deriveConstructionYear("unknown")).toBe(1980);
    });
  });

  describe("deriveConstructionPeriod", () => {
    test("returns '1971-1990' for year 1980", () => {
      expect(deriveConstructionPeriod(1980)).toBe("1971-1990");
    });

    test.each([
      [1944, "pre-1945"],
      [1945, "1945-1970"],
      [1970, "1945-1970"],
      [1971, "1971-1990"],
      [2010, "2001-2010"],
      [2011, "post-2010"],
    ] as const)(
      "boundary: year %i → '%s'",
      (year, expected) => {
        expect(deriveConstructionPeriod(year)).toBe(expected);
      }
    );
  });

});
