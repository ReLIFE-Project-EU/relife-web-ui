import { useEffect, useReducer, type ReactNode } from "react";
import { useGasTariff } from "../../../hooks/useGasTariff";
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
  const gasTariff = useGasTariff(
    state.portfolio.selections.map((selection) => selection.archetype.country),
    state.gasTariffOverrideEurPerKwh,
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
    <StrategyExplorerContext.Provider value={{ state, dispatch, gasTariff }}>
      {children}
    </StrategyExplorerContext.Provider>
  );
}
