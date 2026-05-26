import { describe, expect, test } from "vitest";
import {
  initialState,
  strategyExplorerReducer,
} from "../../../../../src/features/strategy-explorer/context/strategyExplorerReducer";
import type { StrategyExplorerState } from "../../../../../src/features/strategy-explorer/context/types";
import { RSE_PACKAGE_IDS } from "../../../../../src/features/strategy-explorer/constants";

const mockWorkflowResult: NonNullable<StrategyExplorerState["workflowResult"]> =
  {
    request: {
      portfolio: { selections: [] },
      goal: { kind: "energy" },
      packageIds: ["envelope"],
      financialAssumptions: {
        projectLifetimeYears: 20,
        financingType: "self-funded",
        upfrontIncentivePercentage: 0,
        lifetimeIncentiveAmountEur: 0,
        lifetimeIncentiveYears: 0,
      },
    },
    cacheVersion: "v1",
    packageAggregates: [],
    rankings: [],
    unavailableCombinations: [],
  };

describe("strategyExplorerReducer", () => {
  test("initial state", () => {
    expect(initialState.currentStep).toBe(0);
    expect(initialState.portfolio.selections).toEqual([]);
    expect(initialState.goal).toBeNull();
    expect(initialState.packageIds).toEqual([...RSE_PACKAGE_IDS]);
    expect(initialState.availableArchetypes).toEqual([]);
    expect(initialState.workflowResult).toBeNull();
    expect(initialState.isRunningWorkflow).toBe(false);
    expect(initialState.error).toBeNull();
  });

  test("SET_STEP updates current step and clears error", () => {
    const state = strategyExplorerReducer(
      { ...initialState, currentStep: 1, error: "oops" },
      { type: "SET_STEP", step: 2 },
    );
    expect(state.currentStep).toBe(2);
    expect(state.error).toBeNull();
  });

  test("SET_PORTFOLIO updates portfolio and clears workflow result", () => {
    const state = strategyExplorerReducer(
      { ...initialState, workflowResult: mockWorkflowResult },
      {
        type: "SET_PORTFOLIO",
        portfolio: {
          selections: [
            {
              archetype: { country: "IT", category: "SFH", name: "ref-a" },
              buildingCount: 10,
            },
          ],
        },
      },
    );
    expect(state.portfolio.selections).toHaveLength(1);
    expect(state.workflowResult).toBeNull();
  });

  test("SET_GOAL updates goal and clears workflow result", () => {
    const state = strategyExplorerReducer(
      { ...initialState, workflowResult: mockWorkflowResult },
      {
        type: "SET_GOAL",
        goal: { kind: "financial", maxBudgetEur: 1_000_000 },
      },
    );
    expect(state.goal).toEqual({
      kind: "financial",
      maxBudgetEur: 1_000_000,
    });
    expect(state.workflowResult).toBeNull();
  });

  test("SET_PACKAGES updates packages and clears workflow result", () => {
    const state = strategyExplorerReducer(
      { ...initialState, workflowResult: mockWorkflowResult },
      { type: "SET_PACKAGES", packageIds: ["envelope", "combined"] },
    );
    expect(state.packageIds).toEqual(["envelope", "combined"]);
    expect(state.workflowResult).toBeNull();
  });

  test("SET_AVAILABLE_ARCHETYPES updates archetype list", () => {
    const archetypes = [{ country: "IT", category: "SFH", name: "ref-a" }];
    const state = strategyExplorerReducer(initialState, {
      type: "SET_AVAILABLE_ARCHETYPES",
      archetypes,
    });
    expect(state.availableArchetypes).toEqual(archetypes);
  });

  test("START_WORKFLOW sets loading and clears error", () => {
    const state = strategyExplorerReducer(
      { ...initialState, error: "oops" },
      { type: "START_WORKFLOW" },
    );
    expect(state.isRunningWorkflow).toBe(true);
    expect(state.error).toBeNull();
  });

  test("WORKFLOW_COMPLETE stores result and clears loading", () => {
    const state = strategyExplorerReducer(
      { ...initialState, isRunningWorkflow: true },
      { type: "WORKFLOW_COMPLETE", result: mockWorkflowResult },
    );
    expect(state.workflowResult).toEqual(mockWorkflowResult);
    expect(state.isRunningWorkflow).toBe(false);
  });

  test("WORKFLOW_ERROR stores error and clears loading", () => {
    const state = strategyExplorerReducer(
      { ...initialState, isRunningWorkflow: true },
      { type: "WORKFLOW_ERROR", error: "Network failure" },
    );
    expect(state.error).toBe("Network failure");
    expect(state.isRunningWorkflow).toBe(false);
  });

  test("RESET returns initial state", () => {
    const modified: StrategyExplorerState = {
      ...initialState,
      currentStep: 2,
      goal: { kind: "energy" },
      workflowResult: mockWorkflowResult,
    };
    const state = strategyExplorerReducer(modified, { type: "RESET" });
    expect(state).toEqual(initialState);
  });

  test("CLEAR_ERROR removes error", () => {
    const state = strategyExplorerReducer(
      { ...initialState, error: "bad input" },
      { type: "CLEAR_ERROR" },
    );
    expect(state.error).toBeNull();
  });
});
