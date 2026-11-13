import { useEffect, useReducer, useState, type ReactNode } from "react";
import { useSyncGlobalLoading } from "../../../contexts/global-loading";
import type { RSEWorkflowStage } from "../services/rseWorkflowService";
import { useEnergyTariff } from "../../../hooks/useEnergyTariff";
import { archetypePortfolioService } from "../services/archetypePortfolioService";
import {
  strategyExplorerReducer,
  initialState,
} from "./strategyExplorerReducer";
import { StrategyExplorerContext } from "./StrategyExplorerContextDefinition";

interface StrategyExplorerProviderProps {
  children: ReactNode;
}

export function StrategyExplorerProvider({
  children,
}: StrategyExplorerProviderProps) {
  const [state, dispatch] = useReducer(strategyExplorerReducer, initialState);
  const [workflowStage, setWorkflowStage] =
    useState<RSEWorkflowStage>("portfolio");
  useSyncGlobalLoading(
    state.isRunningWorkflow,
    `StrategyExplorer.workflow.${workflowStage}`,
  );
  const gasTariff = useEnergyTariff(
    "gas",
    state.portfolio.selections.map((selection) => selection.archetype.country),
    state.gasTariffOverrideEurPerKwh,
  );

  const electricityTariff = useEnergyTariff(
    "electricity",
    state.portfolio.selections.map((selection) => selection.archetype.country),
    state.electricityTariffOverrideEurPerKwh,
  );

  useEffect(() => {
    let cancelled = false;

    archetypePortfolioService
      .loadArchetypes()
      .then((archetypes) => {
        if (!cancelled) {
          dispatch({ type: "SET_AVAILABLE_ARCHETYPES", archetypes });
        }
      })
      .catch(() => {
        // Silently ignore — the UI will show an empty archetype list.
        // Loading errors are not user-facing for this read-only reference data.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StrategyExplorerContext.Provider
      value={{
        state,
        dispatch,
        gasTariff,
        electricityTariff,
        setWorkflowStage,
      }}
    >
      {children}
    </StrategyExplorerContext.Provider>
  );
}
