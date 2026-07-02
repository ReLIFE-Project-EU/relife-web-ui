import { describe, expect, test } from "vitest";
import {
  formatDecimal,
  formatPaybackYears,
  formatYears,
  isPaybackBeyondHorizon,
} from "../../../src/utils/formatters";

describe("formatYears", () => {
  test("rounds to one decimal place and selects the singular unit", () => {
    expect(formatYears(12.56)).toBe(`${formatDecimal(12.6)} years`);
    expect(formatYears(1.04)).toBe("1 year");
  });
});

describe("isPaybackBeyondHorizon", () => {
  test("detects the backend censor sentinel (lifetime + 1)", () => {
    expect(isPaybackBeyondHorizon(21, 20)).toBe(true);
  });

  test("detects interpolated percentiles between lifetime and the sentinel", () => {
    expect(isPaybackBeyondHorizon(20.4, 20)).toBe(true);
  });

  test("detects non-finite values regardless of lifetime", () => {
    expect(isPaybackBeyondHorizon(NaN, 20)).toBe(true);
    expect(isPaybackBeyondHorizon(Infinity, undefined)).toBe(true);
  });

  test("accepts payback within the horizon", () => {
    expect(isPaybackBeyondHorizon(10.9, 20)).toBe(false);
    expect(isPaybackBeyondHorizon(20, 20)).toBe(false);
  });

  test("cannot flag finite values when the lifetime is unknown", () => {
    expect(isPaybackBeyondHorizon(21, undefined)).toBe(false);
  });
});

describe("formatPaybackYears", () => {
  test("renders the censored sentinel as a label, not a year count", () => {
    expect(formatPaybackYears(21, 20)).toBe("No payback within horizon");
  });

  test("renders uncensored values as years", () => {
    expect(formatPaybackYears(10.9, 20)).toBe(formatYears(10.9));
  });
});
