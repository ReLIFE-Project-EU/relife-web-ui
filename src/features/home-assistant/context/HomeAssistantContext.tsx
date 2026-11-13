/**
 * React Context Provider for the Home Renovation Assistant wizard.
 * Provides state and dispatch to all child components.
 */

import { useReducer, type ReactNode } from "react";
import { useEnergyTariff } from "../../../hooks/useEnergyTariff";
import { homeAssistantReducer, initialState } from "./homeAssistantReducer";
import { HomeAssistantContext } from "./HomeAssistantContextDefinition";

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

interface HomeAssistantProviderProps {
  children: ReactNode;
}

export function HomeAssistantProvider({
  children,
}: HomeAssistantProviderProps) {
  const [state, dispatch] = useReducer(homeAssistantReducer, initialState);
  const gasTariff = useEnergyTariff(
    "gas",
    [state.building.country],
    state.gasTariffOverrideEurPerKwh,
  );

  const electricityTariff = useEnergyTariff(
    "electricity",
    [state.building.country],
    state.electricityTariffOverrideEurPerKwh,
  );

  return (
    <HomeAssistantContext.Provider
      value={{ state, dispatch, gasTariff, electricityTariff }}
    >
      {children}
    </HomeAssistantContext.Provider>
  );
}
