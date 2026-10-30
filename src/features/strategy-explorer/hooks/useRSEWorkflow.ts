import { useCallback } from "react";
import { RSE_FINANCIAL_DEFAULTS } from "../constants";
import { runWorkflow } from "../services/rseWorkflowService";
import type { FundingOptions } from "../../../types/renovation";
import type { RSEWorkflowRequest } from "../types";
import { useStrategyExplorer } from "./useStrategyExplorer";

export function useRSEWorkflow() {
  const { state, dispatch, gasTariff } = useStrategyExplorer();

  const run = useCallback(
    async (options?: {
      gasTariffEurPerKwh?: number;
      funding?: FundingOptions;
    }) => {
      if (
        gasTariff.isLoading ||
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
            funding:
              options?.funding ??
              state.funding ??
              RSE_FINANCIAL_DEFAULTS.funding,
            gasTariffEurPerKwh:
              options?.gasTariffEurPerKwh ?? gasTariff.eurPerKwh,
            gasTariffReference: gasTariff.reference,
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
      gasTariff,
      state.funding,
      dispatch,
    ],
  );

  return {
    run,
    isRunning: state.isRunningWorkflow,
    isGasTariffLoading: gasTariff.isLoading,
  };
}
