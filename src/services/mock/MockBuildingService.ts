/**
 * Mock Building Service
 * Provides dropdown options and default values for building inputs.
 */

import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeDetails } from "../../types/archetype";
import type { BuildingInfo } from "../../types/renovation";
import type {
  ArchetypeMatchResult,
  BuildingOptions,
  IBuildingService,
} from "../types";
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
  async getOptions(): Promise<BuildingOptions> {
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

  async getArchetypes(): Promise<ArchetypeInfo[]> {
    return [];
  }

  async findMatchingArchetype(): Promise<ArchetypeMatchResult | null> {
    return null;
  }

  detectCountryFromCoords(): string | null {
    return null;
  }

  async getAvailableCategories(): Promise<string[]> {
    const options = await this.getOptions();
    return options.buildingTypes.map((opt) => opt.value);
  }

  async getAvailablePeriods() {
    const options = await this.getOptions();
    const periods = options.constructionPeriods.map((opt) => opt.value);
    return {
      periods,
      recommendedPeriod: periods[0] ?? null,
      detectedCountry: null,
      sourceCountry: null,
      scope: "local" as const,
      reason: null,
    };
  }

  async countMatchingArchetypes(): Promise<number> {
    return 0;
  }

  async getArchetypeDetails(): Promise<ArchetypeDetails> {
    throw new Error("Mock service does not support archetype details");
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
