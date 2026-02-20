/**
 * Service Context for Home Renovation Assistant
 *
 * This context provides access to the backend services (building, energy, financial, etc.).
 * It allows swapping between mock implementations and real API implementations.
 */

import { useMemo, type ReactNode } from "react";
import type { IHomeAssistantServices } from "../services/types";
import { mockMCDAService } from "../services";
import { buildingService } from "../services/BuildingService";
import { EnergyService } from "../services/EnergyService";
import { FinancialService } from "../services/FinancialService";
import { RenovationService } from "../services/RenovationService";
import { ServiceContext } from "./ServiceContextDefinition";

// Real API services
const energyService = new EnergyService(buildingService);
const financialService = new FinancialService();
const renovationService = new RenovationService();

// Services: real Building, Financial, Energy and Renovation APIs, mock for MCDA
const defaultServices: IHomeAssistantServices = {
  building: buildingService, // Now using real archetype-based service
  energy: energyService,
  financial: financialService,
  mcda: mockMCDAService,
  renovation: renovationService,
};

interface ServiceProviderProps {
  children: ReactNode;
  /**
   * Optional custom services (e.g. for testing or real API)
   * If not provided, uses default mock services.
   */
  services?: IHomeAssistantServices;
}

export function HomeAssistantServiceProvider({
  children,
  services,
}: ServiceProviderProps) {
  // Use provided services or fall back to defaults (mocks)
  const value = useMemo(() => services || defaultServices, [services]);

  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}
