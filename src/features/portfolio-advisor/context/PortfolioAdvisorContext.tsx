/**
 * React Context Provider for the Portfolio Renovation Advisor wizard.
 * Provides state and dispatch to all child components.
 */

import { useReducer, type ReactNode } from "react";
import { useGasTariff } from "../../../hooks/useGasTariff";
import {
  portfolioAdvisorReducer,
  initialState,
} from "./portfolioAdvisorReducer";
import { PortfolioAdvisorContext } from "./PortfolioAdvisorContextDefinition";

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioAdvisorProviderProps {
  children: ReactNode;
}

export function PortfolioAdvisorProvider({
  children,
}: PortfolioAdvisorProviderProps) {
  const [state, dispatch] = useReducer(portfolioAdvisorReducer, initialState);
  const gasTariff = useGasTariff(
    state.buildings.map((building) => building.country),
    state.gasTariffOverrideEurPerKwh,
  );

  return (
    <PortfolioAdvisorContext.Provider value={{ state, dispatch, gasTariff }}>
      {children}
    </PortfolioAdvisorContext.Provider>
  );
}
