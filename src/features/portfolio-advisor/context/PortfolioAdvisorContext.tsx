/**
 * React Context Provider for the Portfolio Renovation Advisor wizard.
 * Provides state and dispatch to all child components.
 */

import { useReducer, type ReactNode } from "react";
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

  return (
    <PortfolioAdvisorContext.Provider value={{ state, dispatch }}>
      {children}
    </PortfolioAdvisorContext.Provider>
  );
}
