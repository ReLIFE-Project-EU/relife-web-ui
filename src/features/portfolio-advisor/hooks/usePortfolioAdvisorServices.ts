/**
 * Hook to access Portfolio Advisor services
 */

import { useContext } from "react";
import { PortfolioAdvisorServiceContext } from "../context/ServiceContextDefinition";
import type { IPortfolioAdvisorServices } from "../services/types";

export function usePortfolioAdvisorServices(): IPortfolioAdvisorServices {
  const context = useContext(PortfolioAdvisorServiceContext);

  if (!context) {
    throw new Error(
      "usePortfolioAdvisorServices must be used within a PortfolioAdvisorServiceProvider",
    );
  }

  return context;
}
