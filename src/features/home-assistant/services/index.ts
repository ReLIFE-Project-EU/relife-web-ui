/**
 * Home Assistant Services Index
 *
 * This module exports service types, real implementations, and mock implementations.
 * Services should be accessed via the ServiceContext, not imported directly.
 */

// Export real implementations
export { EnergyService } from "./EnergyService";
export {
  ArchetypeNotAvailableError,
  APIConnectionError,
  APIResponseError,
} from "./EnergyService";

// Export mock implementations for use in the ServiceContext or tests
export { mockBuildingService } from "./mock/MockBuildingService";
export { mockRenovationService } from "./mock/MockRenovationService";
export { mockMCDAService } from "./mock/MockMCDAService";

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
