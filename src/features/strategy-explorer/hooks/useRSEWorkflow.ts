import { useCallback } from "react";
import {
  RSE_ENERGY_TARIFF_DEFAULTS,
  RSE_FINANCIAL_DEFAULTS,
} from "../constants";
import { runWorkflow } from "../services/rseWorkflowService";
import type { RSEWorkflowRequest } from "../types";
import { useStrategyExplorer } from "./useStrategyExplorer";

export function useRSEWorkflow() {
  const { state, dispatch } = useStrategyExplorer();

  const run = useCallback(
    async (options?: { gasTariffEurPerKwh?: number }) => {
      if (
        !state.goal ||
        state.portfolio.selections.length === 0 ||
        state.packageIds.length === 0
      ) {
        return;
      }

      dispatch({ type: "START_WORKFLOW" });

      try {
        const request: RSEWorkflowRequest = {
          portfolio: state.portfolio,
          goal: state.goal,
          packageIds: state.packageIds,
          financialAssumptions: {
            projectLifetimeYears: RSE_FINANCIAL_DEFAULTS.projectLifetimeYears,
            financingType: RSE_FINANCIAL_DEFAULTS.financingType,
            upfrontIncentivePercentage:
              RSE_FINANCIAL_DEFAULTS.upfrontIncentivePercentage,
            gasTariffEurPerKwh:
              options?.gasTariffEurPerKwh ??
              state.gasTariffEurPerKwh ??
              RSE_ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
          },
        };

        const result = await runWorkflow(request);
        dispatch({ type: "WORKFLOW_COMPLETE", result });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while running the strategy comparison.";
        dispatch({ type: "WORKFLOW_ERROR", error: message });
      }
    },
    [
      state.goal,
      state.portfolio,
      state.packageIds,
      state.gasTariffEurPerKwh,
      dispatch,
    ],
  );

  return { run, isRunning: state.isRunningWorkflow };
}
