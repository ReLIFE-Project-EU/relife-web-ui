/**
 * Real Building Service Implementation
 * Fetches archetypes from Forecasting API and provides building options
 */

import { forecasting } from "../../../api";
import type { ArchetypeInfo } from "../../../types/forecasting";
import type {
  ArchetypeDetails,
  BuildingPayload,
  SystemPayload,
} from "../../../types/archetype";
import {
  calculateDistance,
  extractConstructionPeriod,
} from "../../../utils/archetypeModifier";
import type { BuildingInfo } from "../context/types";
import type { BuildingOptions, IBuildingService } from "./types";

export class BuildingService implements IBuildingService {
  private archetypesCache: ArchetypeInfo[] | null = null;
  private archetypeDetailsCache: Map<string, ArchetypeDetails> = new Map();

  /**
   * Get building dropdown options derived from available archetypes
   */
  async getOptions(): Promise<BuildingOptions> {
    const archetypes = await this.getArchetypes();

    // Extract unique countries
    const countries = Array.from(new Set(archetypes.map((a) => a.country)))
      .sort()
      .map((country) => ({
        value: country,
        label: country,
      }));

    // Extract unique building categories
    const buildingTypes = Array.from(new Set(archetypes.map((a) => a.category)))
      .sort()
      .map((category) => ({
        value: category,
        label: category,
      }));

    // Extract unique construction periods
    const periodSet = new Set<string>();
    archetypes.forEach((a) => {
      const period = extractConstructionPeriod(a.name);
      if (period) periodSet.add(period);
    });
    const constructionPeriods = Array.from(periodSet)
      .sort()
      .map((period) => ({
        value: period,
        label: period,
      }));

    // Note: These fields are removed as they're not user inputs
    // - climateZones: Not user input, derived from coordinates
    // - heatingTechnologies: Fixed in archetype
    // - coolingTechnologies: Fixed in archetype
    // - hotWaterTechnologies: Fixed in archetype
    // - glazingTechnologies: Fixed in archetype

    return {
      countries,
      buildingTypes,
      constructionPeriods,
      climateZones: [], // Deprecated
      heatingTechnologies: [], // Deprecated
      coolingTechnologies: [], // Deprecated
      hotWaterTechnologies: [], // Deprecated
      glazingTechnologies: [], // Deprecated
    };
  }

  /**
   * Get available archetypes (cached)
   */
  async getArchetypes(
    country?: string,
    category?: string,
  ): Promise<ArchetypeInfo[]> {
    if (!this.archetypesCache) {
      this.archetypesCache = await forecasting.listArchetypes();
    }

    let filtered = this.archetypesCache;

    if (country) {
      filtered = filtered.filter((a) => a.country === country);
    }

    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    return filtered;
  }

  /**
   * Find best matching archetype based on user selections
   * Uses distance-based matching across ALL countries
   */
  async findMatchingArchetype(
    category: string,
    period?: string | null,
    coords?: { lat: number; lng: number } | null,
  ): Promise<ArchetypeInfo | null> {
    // Get ALL archetypes, then filter by category
    const allArchetypes = await this.getArchetypes();
    const archetypes = allArchetypes.filter((a) => a.category === category);

    if (archetypes.length === 0) return null;

    // Filter by construction period if provided
    let candidates = archetypes;
    if (period) {
      candidates = archetypes.filter((a) => {
        const archetypePeriod = extractConstructionPeriod(a.name);
        return archetypePeriod === period;
      });

      // If no match found with period, use all in category
      if (candidates.length === 0) candidates = archetypes;
    }

    // If coordinates provided, find nearest archetype (GLOBALLY, not per country)
    if (coords && coords.lat !== null && coords.lng !== null) {
      // Fetch details for each candidate to get their coordinates
      const candidatesWithDistance = await Promise.all(
        candidates.map(async (archetype) => {
          const details = await this.getArchetypeDetails(archetype);
          const distance = calculateDistance(
            coords.lat!,
            coords.lng!,
            details.location.lat,
            details.location.lng,
          );
          return { archetype, distance };
        }),
      );

      // Sort by distance and return closest (regardless of country)
      candidatesWithDistance.sort((a, b) => a.distance - b.distance);
      return candidatesWithDistance[0].archetype;
    }

    // No coordinates - return first match
    return candidates[0];
  }

  /**
   * Get full archetype details including BUI and System payloads
   */
  async getArchetypeDetails(
    archetype: ArchetypeInfo,
  ): Promise<ArchetypeDetails> {
    const cacheKey = `${archetype.country}:${archetype.category}:${archetype.name}`;

    if (this.archetypeDetailsCache.has(cacheKey)) {
      return this.archetypeDetailsCache.get(cacheKey)!;
    }

    // Fetch from API
    const response = await forecasting.getArchetypeDetails({
      category: archetype.category,
      country: archetype.country,
      name: archetype.name,
    });

    const bui = response.bui as unknown as BuildingPayload;
    const system = response.system as unknown as SystemPayload;

    // Extract high-level details from BUI for UI display
    const details: ArchetypeDetails = {
      ...archetype,
      floorArea: bui.building.net_floor_area,
      numberOfFloors: bui.building.n_floors,
      buildingHeight: bui.building.height,
      totalWindowArea: bui.building_surface
        .filter((s) => s.type === "transparent")
        .reduce((sum, s) => sum + s.area, 0),
      thermalProperties: {
        wallUValue: this.extractUValue(bui, "wall"),
        roofUValue: this.extractUValue(bui, "roof"),
        windowUValue: this.extractUValue(bui, "window"),
      },
      setpoints: {
        heatingSetpoint:
          bui.building_parameters.temperature_setpoints.heating_setpoint,
        heatingSetback:
          bui.building_parameters.temperature_setpoints.heating_setback,
        coolingSetpoint:
          bui.building_parameters.temperature_setpoints.cooling_setpoint,
        coolingSetback:
          bui.building_parameters.temperature_setpoints.cooling_setback,
      },
      location: {
        lat: bui.building.latitude,
        lng: bui.building.longitude,
      },
      bui,
      system,
    };

    this.archetypeDetailsCache.set(cacheKey, details);
    return details;
  }

  /**
   * Get available building categories based on coordinates
   * Returns only categories that have archetypes near the given location
   */
  async getAvailableCategories(
    coords?: { lat: number; lng: number } | null,
  ): Promise<string[]> {
    const allArchetypes = await this.getArchetypes();

    // If no coordinates, return all unique categories
    if (!coords || coords.lat === null || coords.lng === null) {
      return Array.from(new Set(allArchetypes.map((a) => a.category))).sort();
    }

    // With coordinates, return categories sorted by nearest archetype
    const categoriesWithDistance = await Promise.all(
      Array.from(new Set(allArchetypes.map((a) => a.category))).map(
        async (category) => {
          // Find nearest archetype in this category
          const categoryArchetypes = allArchetypes.filter(
            (a) => a.category === category,
          );
          const distances = await Promise.all(
            categoryArchetypes.map(async (archetype) => {
              const details = await this.getArchetypeDetails(archetype);
              return calculateDistance(
                coords.lat!,
                coords.lng!,
                details.location.lat,
                details.location.lng,
              );
            }),
          );
          const minDistance = Math.min(...distances);
          return { category, distance: minDistance };
        },
      ),
    );

    // Sort by distance and return category names
    categoriesWithDistance.sort((a, b) => a.distance - b.distance);
    return categoriesWithDistance.map((c) => c.category);
  }

  /**
   * Get available construction periods for a given category
   */
  async getAvailablePeriods(category: string): Promise<string[]> {
    const archetypes = await this.getArchetypes();
    const filtered = archetypes.filter((a) => a.category === category);

    const periods = new Set<string>();
    filtered.forEach((a) => {
      const period = extractConstructionPeriod(a.name);
      if (period) periods.add(period);
    });

    return Array.from(periods).sort();
  }

  /**
   * Count available archetypes matching criteria
   */
  async countMatchingArchetypes(
    category?: string,
    period?: string,
  ): Promise<number> {
    let archetypes = await this.getArchetypes();

    if (category) {
      archetypes = archetypes.filter((a) => a.category === category);
    }

    if (period) {
      archetypes = archetypes.filter((a) => {
        const archetypePeriod = extractConstructionPeriod(a.name);
        return archetypePeriod === period;
      });
    }

    return archetypes.length;
  }

  /**
   * Get default building values for a country (deprecated)
   * Returns empty object since archetypes provide all defaults
   */
  getDefaultsForCountry(): Partial<BuildingInfo> {
    return {};
  }

  /**
   * Extract U-value for a specific surface type
   */
  private extractUValue(
    bui: BuildingPayload,
    type: "wall" | "roof" | "window",
  ): number {
    let surface;

    if (type === "window") {
      surface = bui.building_surface.find((s) => s.type === "transparent");
    } else {
      surface = bui.building_surface.find((s) => {
        const name = s.name.toLowerCase();
        return s.type === "opaque" && name.includes(type);
      });
    }

    return surface?.u_value || 0;
  }
}

// Export singleton instance
export const buildingService = new BuildingService();
