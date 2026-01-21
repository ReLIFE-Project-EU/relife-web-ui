/**
 * Service Context for Home Renovation Assistant
 *
 * This context provides access to the backend services (building, energy, financial, etc.).
 * It allows swapping between mock implementations and real API implementations.
 */

import { useMemo, type ReactNode } from "react";
import type { IHomeAssistantServices } from "../services/types";
import {
  mockBuildingService,
  mockMCDAService,
  mockRenovationService,
} from "../services";
import { EnergyService } from "../services/EnergyService";
import { FinancialService } from "../services/FinancialService";
import { ServiceContext } from "./ServiceContextDefinition";

// Real API services
const energyService = new EnergyService();
const financialService = new FinancialService();

// Services: real Financial and Energy APIs, mocks for others (pending integration)
const defaultServices: IHomeAssistantServices = {
  building: mockBuildingService,
  energy: energyService,
  financial: financialService,
  mcda: mockMCDAService,
  renovation: mockRenovationService,
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
