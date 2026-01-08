/**
 * React Context Provider for the Home Renovation Assistant wizard.
 * Provides state and dispatch to all child components.
 */

import { useReducer, type ReactNode } from "react";
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

  return (
    <HomeAssistantContext.Provider value={{ state, dispatch }}>
      {children}
    </HomeAssistantContext.Provider>
  );
}
