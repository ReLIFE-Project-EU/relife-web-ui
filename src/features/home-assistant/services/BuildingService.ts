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

/**
 * Reference locations for each country's archetypes (capital cities).
 * WORKAROUND: The Forecasting API BUI data has incorrect coordinates
 * (all archetypes share Greece coords). This mapping provides correct
 * reference locations for distance-based matching.
 *
 * Covers all 27 EU member states for future archetype additions.
 *
 * TODO: Remove this when backend fixes BUI coordinates or adds lat/lng
 * to the /building/available response.
 */
const ARCHETYPE_REFERENCE_LOCATIONS: Record<
  string,
  { lat: number; lng: number }
> = {
  // Current archetypes
  Greece: { lat: 37.98, lng: 23.73 }, // Athens
  Italy: { lat: 41.9, lng: 12.5 }, // Rome

  // Other EU member states (for future archetypes)
  Austria: { lat: 48.21, lng: 16.37 }, // Vienna
  Belgium: { lat: 50.85, lng: 4.35 }, // Brussels
  Bulgaria: { lat: 42.7, lng: 23.32 }, // Sofia
  Croatia: { lat: 45.81, lng: 15.98 }, // Zagreb
  Cyprus: { lat: 35.17, lng: 33.36 }, // Nicosia
  Czechia: { lat: 50.08, lng: 14.44 }, // Prague
  Denmark: { lat: 55.68, lng: 12.57 }, // Copenhagen
  Estonia: { lat: 59.44, lng: 24.75 }, // Tallinn
  Finland: { lat: 60.17, lng: 24.94 }, // Helsinki
  France: { lat: 48.86, lng: 2.35 }, // Paris
  Germany: { lat: 52.52, lng: 13.41 }, // Berlin
  Hungary: { lat: 47.5, lng: 19.04 }, // Budapest
  Ireland: { lat: 53.33, lng: -6.26 }, // Dublin
  Latvia: { lat: 56.95, lng: 24.11 }, // Riga
  Lithuania: { lat: 54.69, lng: 25.28 }, // Vilnius
  Luxembourg: { lat: 49.61, lng: 6.13 }, // Luxembourg City
  Malta: { lat: 35.9, lng: 14.51 }, // Valletta
  Netherlands: { lat: 52.37, lng: 4.89 }, // Amsterdam
  Poland: { lat: 52.23, lng: 21.01 }, // Warsaw
  Portugal: { lat: 38.72, lng: -9.14 }, // Lisbon
  Romania: { lat: 44.43, lng: 26.1 }, // Bucharest
  Slovakia: { lat: 48.15, lng: 17.11 }, // Bratislava
  Slovenia: { lat: 46.06, lng: 14.51 }, // Ljubljana
  Spain: { lat: 40.42, lng: -3.7 }, // Madrid
  Sweden: { lat: 59.33, lng: 18.07 }, // Stockholm
};

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

    // If coordinates provided, find nearest archetype using reference locations
    if (coords && coords.lat !== null && coords.lng !== null) {
      const candidatesWithDistance = candidates.map((archetype) => {
        // Use reference location for country (workaround for incorrect BUI coords)
        const refLocation = ARCHETYPE_REFERENCE_LOCATIONS[archetype.country];
        if (!refLocation) {
          // Fallback: unknown country gets max distance
          return { archetype, distance: Infinity };
        }
        const distance = calculateDistance(
          coords.lat!,
          coords.lng!,
          refLocation.lat,
          refLocation.lng,
        );
        return { archetype, distance };
      });

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
    const categoriesWithDistance = Array.from(
      new Set(allArchetypes.map((a) => a.category)),
    ).map((category) => {
      // Find nearest archetype in this category using reference locations
      const categoryArchetypes = allArchetypes.filter(
        (a) => a.category === category,
      );
      const distances = categoryArchetypes.map((archetype) => {
        const refLocation = ARCHETYPE_REFERENCE_LOCATIONS[archetype.country];
        if (!refLocation) return Infinity;
        return calculateDistance(
          coords.lat!,
          coords.lng!,
          refLocation.lat,
          refLocation.lng,
        );
      });
      const minDistance = Math.min(...distances);
      return { category, distance: minDistance };
    });

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
