/**
 * Service interfaces for the Home Renovation Assistant.
 *
 * Shared service interfaces are defined in src/services/types.ts; import them
 * from there directly. This file holds only the HRA-specific aggregate.
 */

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
