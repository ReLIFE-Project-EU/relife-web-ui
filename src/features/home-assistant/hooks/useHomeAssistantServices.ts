/**
 * Hook to access Home Assistant services
 */

import { useContext } from "react";
import { ServiceContext } from "../context/ServiceContextDefinition";
import type { IHomeAssistantServices } from "../services/types";

export function useHomeAssistantServices(): IHomeAssistantServices {
  const context = useContext(ServiceContext);

  if (!context) {
    throw new Error(
      "useHomeAssistantServices must be used within a HomeAssistantServiceProvider",
    );
  }

  return context;
}
