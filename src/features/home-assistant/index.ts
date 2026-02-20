/**
 * Home Renovation Assistant Feature
 *
 * A wizard-based tool for homeowners to:
 * 1. Input building information and get EPC estimation
 * 2. Select renovation measures and funding options
 * 3. Compare scenarios and get MCDA-based recommendations
 */

// Main component
export { HomeAssistant } from "./HomeAssistant";

// Context (if needed externally)
export { HomeAssistantProvider } from "./context/HomeAssistantContext";
export { useHomeAssistant } from "./hooks/useHomeAssistant";

// Types (for external use)
export type {
  BuildingInfo,
  EstimationResult,
  FundingOptions,
  HomeAssistantState,
  PackageId,
  RenovationScenario,
  ScenarioId,
} from "./context/types";

// Services (for potential testing or extension)
export {
  EnergyService,
  mockBuildingService,
  mockMCDAService,
  mockRenovationService,
} from "./services";
