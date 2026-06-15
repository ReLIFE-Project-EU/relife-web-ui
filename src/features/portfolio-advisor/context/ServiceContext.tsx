/**
 * Service Context for Portfolio Renovation Advisor
 *
 * Provides access to the backend services (building, energy, financial, etc.).
 * Uses "professional" output level for financial risk assessment.
 */

import { useEffect, useMemo, type ReactNode } from "react";
import { buildingService } from "../../../services/BuildingService";
import { EnergyService } from "../../../services/EnergyService";
import { FinancialService } from "../../../services/FinancialService";
import { RenovationService } from "../../../services/RenovationService";
import {
  MockMCDAService,
  mockMCDAService,
} from "../../../services/mock/MockMCDAService";
import { PortfolioAnalysisService } from "../services/PortfolioAnalysisService";
import { PRA_OUTPUT_LEVEL } from "../constants";
import type { IPortfolioAdvisorServices } from "../services/types";
import { PortfolioAdvisorServiceContext } from "./ServiceContextDefinition";
import { auditLog } from "../../../utils/auditLogger";

const energyService = new EnergyService(buildingService);
const financialService = new FinancialService(PRA_OUTPUT_LEVEL);
const renovationService = new RenovationService();
const portfolioAnalysisService = new PortfolioAnalysisService(
  energyService,
  renovationService,
  financialService,
  buildingService,
);

const defaultServices: IPortfolioAdvisorServices = {
  building: buildingService,
  energy: energyService,
  renovation: renovationService,
  financial: financialService,
  mcda: mockMCDAService,
  portfolioAnalysis: portfolioAnalysisService,
};

interface ServiceProviderProps {
  children: ReactNode;
  services?: IPortfolioAdvisorServices;
}

export function PortfolioAdvisorServiceProvider({
  children,
  services,
}: ServiceProviderProps) {
  const value = useMemo(() => services || defaultServices, [services]);

  useEffect(() => {
    if (!auditLog.enabled) return;
    auditLog.info("env", "env.detect", {
      tool: "pra",
      injected: !!services,
      services: {
        energy: value.energy.constructor.name,
        renovation: value.renovation.constructor.name,
        financial: value.financial.constructor.name,
        mcda: value.mcda.constructor.name,
        portfolioAnalysis: value.portfolioAnalysis.constructor.name,
      },
      mcdaPath:
        value.mcda instanceof MockMCDAService ? "mock-frontend" : "custom",
      financialOutputLevel: PRA_OUTPUT_LEVEL,
    });
  }, [value, services]);

  return (
    <PortfolioAdvisorServiceContext.Provider value={value}>
      {children}
    </PortfolioAdvisorServiceContext.Provider>
  );
}
