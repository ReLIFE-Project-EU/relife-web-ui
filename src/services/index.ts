/**
 * Shared Services Index
 *
 * This module exports service types, real implementations, and mock implementations.
 */

// Export real implementations
export { buildingService, BuildingService } from "./BuildingService";
export { EnergyService } from "./EnergyService";
export {
  ArchetypeNotAvailableError,
  APIConnectionError,
  APIResponseError,
} from "./EnergyService";
export { FinancialService } from "./FinancialService";
export { RenovationService } from "./RenovationService";

// Export mock implementations for use in tests
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
  ARVRequest,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  TechnicalPillarRequest,
  TechnicalPillarResponse,
} from "./types";

// Export energy utils
export {
  EPC_THRESHOLDS,
  ENERGY_PRICE_EUR_PER_KWH,
  NON_HVAC_ENERGY_MULTIPLIER,
  DEFAULT_FLOOR_AREA,
  getEPCClass,
  transformColumnarToRowFormat,
  calculateAnnualTotals,
} from "./energyUtils";
