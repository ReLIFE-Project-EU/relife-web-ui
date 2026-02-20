/**
 * Service interfaces for the Home Renovation Assistant.
 *
 * Shared service interfaces are defined in src/services/types.ts.
 * This file re-exports them and adds the HRA-specific aggregated interface.
 */

// Re-export all shared service types
export type {
  SelectOption,
  BuildingOptions,
  IBuildingService,
  IEnergyService,
  IRenovationService,
  IFinancialService,
  IMCDAService,
  MCDAPersona,
  MeasureCategory,
  MeasureCategoryInfo,
  RenovationMeasure,
  ARVRequest,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  TechnicalPillarRequest,
  TechnicalPillarResponse,
} from "../../../services/types";

import type {
  IBuildingService,
  IEnergyService,
  IFinancialService,
  IMCDAService,
  IRenovationService,
} from "../../../services/types";

// ─────────────────────────────────────────────────────────────────────────────
// HRA-specific Aggregated Service Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IHomeAssistantServices {
  building: IBuildingService;
  energy: IEnergyService;
  renovation: IRenovationService;
  financial: IFinancialService;
  mcda: IMCDAService;
}
