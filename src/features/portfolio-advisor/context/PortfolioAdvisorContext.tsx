/**
 * React Context Provider for the Portfolio Renovation Advisor wizard.
 * Provides state and dispatch to all child components.
 */

import { useReducer, type ReactNode } from "react";
import { useEnergyTariff } from "../../../hooks/useEnergyTariff";
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
  const gasTariff = useEnergyTariff(
    "gas",
    state.buildings.map((building) => building.country),
    state.gasTariffOverrideEurPerKwh,
  );

  const electricityTariff = useEnergyTariff(
    "electricity",
    state.buildings.map((building) => building.country),
    state.electricityTariffOverrideEurPerKwh,
  );

  return (
    <PortfolioAdvisorContext.Provider
      value={{ state, dispatch, gasTariff, electricityTariff }}
    >
      {children}
    </PortfolioAdvisorContext.Provider>
  );
}
