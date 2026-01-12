/**
 * Mock Building Service
 * Provides dropdown options and default values for building inputs.
 */

import type { BuildingInfo } from "../../context/types";
import type { BuildingOptions, IBuildingService } from "../types";
import {
  BUILDING_TYPES,
  CLIMATE_ZONES,
  CONSTRUCTION_PERIODS,
  COOLING_TECHNOLOGIES,
  COUNTRIES,
  COUNTRY_DEFAULTS,
  EPC_CLASSES_INTERNAL,
  GLAZING_TECHNOLOGIES,
  HEATING_TECHNOLOGIES,
  HOT_WATER_TECHNOLOGIES,
} from "./data/buildingOptions";

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockBuildingService implements IBuildingService {
  getOptions(): BuildingOptions {
    return {
      countries: COUNTRIES,
      climateZones: CLIMATE_ZONES,
      buildingTypes: BUILDING_TYPES,
      constructionPeriods: CONSTRUCTION_PERIODS,
      heatingTechnologies: HEATING_TECHNOLOGIES,
      coolingTechnologies: COOLING_TECHNOLOGIES,
      hotWaterTechnologies: HOT_WATER_TECHNOLOGIES,
      glazingTechnologies: GLAZING_TECHNOLOGIES,
    };
  }

  /**
   * Get available EPC classes for internal use (display, validation).
   * Note: EPC is NOT a user input - it comes from the Forecasting API.
   */
  getEPCClasses(): string[] {
    return EPC_CLASSES_INTERNAL;
  }

  getDefaultsForCountry(country: string): Partial<BuildingInfo> {
    return COUNTRY_DEFAULTS[country] || {};
  }
}

// Export singleton instance
export const mockBuildingService: IBuildingService = new MockBuildingService();
