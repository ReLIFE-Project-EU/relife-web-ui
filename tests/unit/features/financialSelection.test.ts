import { describe, expect, test } from "vitest";
import type { FinancialResults } from "../../../src/features/home-assistant/context/types";
import {
  getEffectiveDetailScenarioId,
  hasFinancialResultForScenario,
} from "../../../src/features/home-assistant/components/results/financialSelection";

describe("getEffectiveDetailScenarioId", () => {
  const scenarios = [
    { id: "package-wall-insulation" },
    { id: "package-windows" },
    { id: "package-wall-insulation-windows" },
  ];
  const financialResults = {
    "package-wall-insulation": {} as FinancialResults,
    "package-wall-insulation-windows": {} as FinancialResults,
  };

  test("returns the selected scenario when it is still available", () => {
    expect(
      getEffectiveDetailScenarioId(
        scenarios,
        financialResults,
        "package-wall-insulation-windows",
      ),
    ).toBe("package-wall-insulation-windows");
  });

  test("falls back to the first scenario with financial data when the selection has no result", () => {
    expect(
      getEffectiveDetailScenarioId(
        scenarios,
        financialResults,
        "package-windows",
      ),
    ).toBe("package-wall-insulation");
  });

  test("falls back to the first scenario with financial data when the selection is stale", () => {
    expect(
      getEffectiveDetailScenarioId(
        scenarios,
        financialResults,
        "package-missing",
      ),
    ).toBe("package-wall-insulation");
  });

  test("returns null when no evaluated scenarios have financial results", () => {
    expect(getEffectiveDetailScenarioId(scenarios, {}, null)).toBeNull();
  });

  test("returns null when there are no evaluated scenarios", () => {
    expect(getEffectiveDetailScenarioId([], financialResults, null)).toBeNull();
  });
});

describe("hasFinancialResultForScenario", () => {
  const financialResults = {
    "package-wall-insulation": {} as FinancialResults,
  };

  test("returns true when the scenario has a financial result", () => {
    expect(
      hasFinancialResultForScenario(
        financialResults,
        "package-wall-insulation",
      ),
    ).toBe(true);
  });

  test("returns false when the scenario has no financial result", () => {
    expect(
      hasFinancialResultForScenario(financialResults, "package-windows"),
    ).toBe(false);
  });
});
