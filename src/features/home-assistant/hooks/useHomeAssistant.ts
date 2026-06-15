import { useContext } from "react";
import {
  HomeAssistantContext,
  type HomeAssistantContextValue,
} from "../context/HomeAssistantContextDefinition";

// Re-export context value type for convenience
export type { HomeAssistantContextValue };

// ─────────────────────────────────────────────────────────────────────────────
// Consumer Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useHomeAssistant(): HomeAssistantContextValue {
  const context = useContext(HomeAssistantContext);

  if (!context) {
    throw new Error(
      "useHomeAssistant must be used within a HomeAssistantProvider",
    );
  }

  return context;
}
