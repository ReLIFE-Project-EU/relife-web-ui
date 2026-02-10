/**
 * Home Assistant Services Index
 *
 * Re-exports from shared services plus HRA-specific types.
 * Services should be accessed via the ServiceContext, not imported directly.
 */

// Export real implementations (via shared)
export { buildingService } from "./BuildingService";
export { EnergyService } from "./EnergyService";
export {
  ArchetypeNotAvailableError,
  APIConnectionError,
  APIResponseError,
} from "./EnergyService";

// Export mock implementations (via shared)
export { mockBuildingService } from "../../../services/mock/MockBuildingService";
export { mockRenovationService } from "../../../services/mock/MockRenovationService";
export { mockMCDAService } from "../../../services/mock/MockMCDAService";

// Re-export types
export type {
  BuildingOptions,
  IBuildingService,
  IEnergyService,
  IFinancialService,
  IMCDAService,
  IRenovationService,
  MCDAPersona,
  MeasureCategory,
  MeasureCategoryInfo,
  RenovationMeasure,
  SelectOption,
  IHomeAssistantServices,
} from "./types";
