/**
 * Service Context for Home Renovation Assistant
 *
 * This context provides access to the default Home Assistant service bundle.
 * Callers can inject alternate implementations for tests or specialized flows.
 */

import { useEffect, useMemo, type ReactNode } from "react";
import type { IHomeAssistantServices } from "../services/types";
import { buildingService } from "../services/BuildingService";
import { EnergyService } from "../services/EnergyService";
import { FinancialService } from "../services/FinancialService";
import { RenovationService } from "../services/RenovationService";
import { TechnicalMCDAService } from "../../../services/TechnicalMCDAService";
import { MockMCDAService } from "../../../services/mock/MockMCDAService";
import { ServiceContext } from "./ServiceContextDefinition";
import { auditLog } from "../../../utils/auditLogger";

interface ServiceProviderProps {
  children: ReactNode;
  /**
   * Optional custom services for tests or alternate service bundles.
   */
  services?: IHomeAssistantServices;
}

export function HomeAssistantServiceProvider({
  children,
  services,
}: ServiceProviderProps) {
  const value = useMemo<IHomeAssistantServices>(() => {
    if (services) {
      return services;
    }

    return {
      building: buildingService,
      energy: new EnergyService(buildingService),
      financial: new FinancialService(),
      mcda: new TechnicalMCDAService(),
      renovation: new RenovationService(),
    };
  }, [services]);

  useEffect(() => {
    if (!auditLog.enabled) return;
    auditLog.info("env", "env.detect", {
      tool: "hra",
      injected: !!services,
      services: {
        energy: value.energy.constructor.name,
        renovation: value.renovation.constructor.name,
        financial: value.financial.constructor.name,
        mcda: value.mcda.constructor.name,
      },
      mcdaPath:
        value.mcda instanceof TechnicalMCDAService
          ? "technical-backend"
          : value.mcda instanceof MockMCDAService
            ? "mock-frontend"
            : "custom",
      financialOutputLevel: "private",
    });
  }, [value, services]);

  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}
