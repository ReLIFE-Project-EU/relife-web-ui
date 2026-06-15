/**
 * Hook to access Portfolio Advisor context
 */

import { useContext } from "react";
import {
  PortfolioAdvisorContext,
  type PortfolioAdvisorContextValue,
} from "../context/PortfolioAdvisorContextDefinition";

// Re-export context value type for convenience
export type { PortfolioAdvisorContextValue };

// ─────────────────────────────────────────────────────────────────────────────
// Consumer Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolioAdvisor(): PortfolioAdvisorContextValue {
  const context = useContext(PortfolioAdvisorContext);

  if (!context) {
    throw new Error(
      "usePortfolioAdvisor must be used within a PortfolioAdvisorProvider",
    );
  }

  return context;
}
