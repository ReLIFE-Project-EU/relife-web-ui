import { describe, expect, test } from "vitest";
import {
  countryNamesEqual,
  getCountryFlag,
  getCountryReferenceLocation,
  normalizeCountryName,
} from "../../../src/utils/countries";

describe("countries", () => {
  test("normalizes Czech Republic alias to Czechia", () => {
    expect(normalizeCountryName("Czech Republic")).toBe("Czechia");
    expect(countryNamesEqual("Czech Republic", "Czechia")).toBe(true);
  });

  test("returns a safe flag for canonical and alias names", () => {
    expect(getCountryFlag("CZ")).toBe("🇨🇿");
    expect(getCountryFlag("Czech Republic")).toBe("🇨🇿");
    expect(getCountryFlag("Unknownland")).toBeUndefined();
  });

  test("returns the same reference location for canonical and alias names", () => {
    expect(getCountryReferenceLocation("Czech Republic")).toEqual(
      getCountryReferenceLocation("Czechia"),
    );
  });
});
