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
export { TechnicalMCDAService } from "./TechnicalMCDAService";

// Export mock implementations for use in tests
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
  RiskAssessmentServiceRequest,
  RiskAssessmentServiceResponse,
  TechnicalPillarRequest,
  TechnicalPillarResponse,
} from "./types";

// Export energy utils
export {
  EPC_THRESHOLDS,
  DEFAULT_FLOOR_AREA,
  getEPCClass,
  transformColumnarToRowFormat,
  calculateAnnualTotals,
} from "./energyUtils";
