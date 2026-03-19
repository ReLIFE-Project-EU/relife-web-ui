/**
 * Mock Building Service
 * Provides dropdown options and default values for building inputs.
 */

import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeDetails } from "../../types/archetype";
import type { BuildingInfo } from "../../types/renovation";
import { getCountryCode } from "../../utils/countries";
import type {
  ArchetypeMatchResult,
  BuildingOptions,
  IBuildingService,
  PeriodAvailabilityResult,
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

  async getArchetypes(
    country?: string,
    category?: string,
  ): Promise<ArchetypeInfo[]> {
    void country;
    void category;
    return [];
  }

  async findMatchingArchetype(
    category: string,
    period?: string | null,
    coords?: { lat: number; lng: number } | null,
  ): Promise<ArchetypeMatchResult | null> {
    void category;
    void period;
    void coords;
    return null;
  }

  detectCountryFromCoords(coords: { lat: number; lng: number }): string | null {
    void coords;
    return null;
  }

  async getAvailableCategories(
    coords?: { lat: number; lng: number } | null,
  ): Promise<string[]> {
    void coords;
    const options = await this.getOptions();
    return options.buildingTypes.map((opt) => opt.value);
  }

  async getAvailablePeriods(
    category: string,
    country?: string,
  ): Promise<PeriodAvailabilityResult> {
    void category;
    void country;
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

  async countMatchingArchetypes(
    category?: string,
    period?: string,
    country?: string,
  ): Promise<number> {
    void category;
    void period;
    void country;
    return 0;
  }

  async getArchetypeDetails(
    archetype: ArchetypeInfo,
  ): Promise<ArchetypeDetails> {
    void archetype;
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
    const countryCode = getCountryCode(country);
    return countryCode ? (COUNTRY_DEFAULTS[countryCode] ?? {}) : {};
  }
}

// Export singleton instance
export const mockBuildingService: IBuildingService = new MockBuildingService();
