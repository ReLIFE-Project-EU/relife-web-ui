import { describe, expect, test } from "vitest";
import { formatDecimal, formatYears } from "../../../src/utils/formatters";

describe("formatYears", () => {
  test("rounds to one decimal place and selects the singular unit", () => {
    expect(formatYears(12.56)).toBe(`${formatDecimal(12.6)} years`);
    expect(formatYears(1.04)).toBe("1 year");
  });
});
