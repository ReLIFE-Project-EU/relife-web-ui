/**
 * Real Building Service Implementation
 * Fetches archetypes from Forecasting API and provides building options
 */

import { forecasting } from "../api";
import type { ArchetypeInfo } from "../types/forecasting";
import type {
  ArchetypeDetails,
  BuildingPayload,
  BuildingSurface,
  SystemPayload,
} from "../types/archetype";
import {
  calculateDistance,
  extractConstructionPeriod,
} from "../utils/archetypeModifier";
import {
  compareConstructionPeriods,
  constructionPeriodsEqual,
  deriveConstructionYear,
  normalizeConstructionPeriod,
} from "../utils/apiMappings";
import {
  MAX_EU_DISTANCE_KM,
  detectCountry,
  getReferenceLocationForCountry,
} from "../constants/archetypeLocations";
import type { BuildingInfo } from "../types/renovation";
import { COUNTRY_DEFAULTS } from "./mock/data/buildingOptions";
import type {
  ArchetypeMatchAlternative,
  ArchetypeMatchResult,
  ArchetypeScoreBreakdown,
  BuildingOptions,
  IBuildingService,
  MatchQuality,
  PeriodAvailabilityResult,
} from "./types";
import {
  countryNamesEqual,
  getCountryCode,
  normalizeCountryName,
} from "../utils/countries";

// Scoring weights for archetype matching
const W_COUNTRY = 100;
const W_PERIOD = 10;
const W_GEO = 1;
const MIN_ACCEPTABLE_LOCAL_PERIOD_SCORE = 0.5;

// Maximum year gap for period proximity scoring (~80 years covers all periods)
const MAX_PERIOD_YEAR_GAP = 80;

export class BuildingService implements IBuildingService {
  private archetypesCache: ArchetypeInfo[] | null = null;
  private archetypeDetailsCache: Map<string, ArchetypeDetails> = new Map();

  private collectPeriods(archetypes: ArchetypeInfo[]): string[] {
    const periods = new Set<string>();
    archetypes.forEach((archetype) => {
      const period = extractConstructionPeriod(archetype.name);
      if (period) {
        periods.add(period);
      }
    });

    return Array.from(periods).sort(compareConstructionPeriods);
  }

  private getRecommendedArchetype(
    archetypes: ArchetypeInfo[],
    detectedCountry?: string | null,
  ): ArchetypeInfo | null {
    if (archetypes.length === 0) {
      return null;
    }

    const normalizedCountry = normalizeCountryName(detectedCountry) ?? null;
    if (normalizedCountry) {
      const localArchetype = archetypes.find((archetype) =>
        countryNamesEqual(archetype.country, normalizedCountry),
      );
      if (localArchetype) {
        return localArchetype;
      }

      const userLocation = getReferenceLocationForCountry(normalizedCountry);
      if (userLocation) {
        const scored = archetypes
          .map((archetype) => {
            const referenceLocation = getReferenceLocationForCountry(
              archetype.country,
            );
            if (!referenceLocation) {
              return { archetype, distance: Infinity };
            }

            return {
              archetype,
              distance: calculateDistance(
                userLocation.lat,
                userLocation.lng,
                referenceLocation.lat,
                referenceLocation.lng,
              ),
            };
          })
          .sort((left, right) => left.distance - right.distance);

        if (scored[0]) {
          return scored[0].archetype;
        }
      }
    }

    return [...archetypes].sort((left, right) =>
      `${normalizeCountryName(left.country) ?? left.country}:${left.name}`.localeCompare(
        `${normalizeCountryName(right.country) ?? right.country}:${right.name}`,
      ),
    )[0];
  }

  /**
   * Get building dropdown options derived from available archetypes
   */
  async getOptions(): Promise<BuildingOptions> {
    const archetypes = await this.getArchetypes();

    // Extract unique countries
    const countries = Array.from(
      new Set(
        archetypes.map(
          (archetype) =>
            normalizeCountryName(archetype.country) ?? archetype.country,
        ),
      ),
    )
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
      .sort(compareConstructionPeriods)
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
      filtered = filtered.filter((archetype) =>
        countryNamesEqual(archetype.country, country),
      );
    }

    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    return filtered;
  }

  /**
   * Detect country from coordinates using bundled offline EU polygons.
   */
  detectCountryFromCoords(coords: { lat: number; lng: number }): string | null {
    return detectCountry(coords, calculateDistance);
  }

  /**
   * Compute a composite score for an archetype against user inputs.
   * Higher score = better match.
   */
  private scoreArchetype(
    archetype: ArchetypeInfo,
    userCountry: string | null,
    userPeriod: string | null,
    coords: { lat: number; lng: number } | null,
  ): ArchetypeScoreBreakdown {
    // Country score: 1.0 if same country, 0.0 otherwise
    const countryScore =
      userCountry && countryNamesEqual(archetype.country, userCountry)
        ? 1.0
        : 0.0;

    // Period proximity score: linear decay based on midpoint year distance
    let periodScore = 0.0;
    const normalizedUserPeriod = normalizeConstructionPeriod(userPeriod);
    if (normalizedUserPeriod) {
      const archetypePeriod = extractConstructionPeriod(archetype.name);
      if (archetypePeriod) {
        if (constructionPeriodsEqual(archetypePeriod, normalizedUserPeriod)) {
          periodScore = 1.0;
        } else {
          const userYear = deriveConstructionYear(normalizedUserPeriod);
          const archetypeYear = deriveConstructionYear(archetypePeriod);
          const yearGap = Math.abs(userYear - archetypeYear);
          periodScore = Math.max(0, 1.0 - yearGap / MAX_PERIOD_YEAR_GAP);
        }
      }
    }

    // Geographic score: inverse normalized distance
    let geoScore = 0.0;
    if (coords) {
      const refLocation = getReferenceLocationForCountry(archetype.country);
      if (refLocation) {
        const distance = calculateDistance(
          coords.lat,
          coords.lng,
          refLocation.lat,
          refLocation.lng,
        );
        geoScore = Math.max(0, 1.0 - distance / MAX_EU_DISTANCE_KM);
      }
    }

    const total =
      W_COUNTRY * countryScore + W_PERIOD * periodScore + W_GEO * geoScore;

    return { countryScore, periodScore, geoScore, total };
  }

  /**
   * Determine match quality from score breakdown.
   */
  private deriveMatchQuality(breakdown: ArchetypeScoreBreakdown): MatchQuality {
    if (breakdown.countryScore === 1.0 && breakdown.periodScore === 1.0) {
      return "excellent";
    }
    if (breakdown.countryScore === 1.0 && breakdown.periodScore >= 0.5) {
      return "good";
    }
    return "approximate";
  }

  /**
   * Find best matching archetype based on user selections.
   * Uses weighted scoring: country affinity (dominant) > period proximity > geographic distance.
   * Returns rich match result with score breakdown and alternatives.
   */
  async findMatchingArchetype(
    category: string,
    period?: string | null,
    coords?: { lat: number; lng: number } | null,
  ): Promise<ArchetypeMatchResult | null> {
    const allArchetypes = await this.getArchetypes();
    const archetypes = allArchetypes.filter((a) => a.category === category);

    if (archetypes.length === 0) return null;

    // Detect user's country from coordinates
    const detectedCountry = coords
      ? detectCountry(coords, calculateDistance)
      : null;

    // Score all candidates
    const scored = archetypes.map((archetype) => {
      const breakdown = this.scoreArchetype(
        archetype,
        detectedCountry,
        period ?? null,
        coords ?? null,
      );
      return { archetype, breakdown };
    });

    // Sort by total score descending
    scored.sort((a, b) => b.breakdown.total - a.breakdown.total);

    const normalizedPeriod = normalizeConstructionPeriod(period);
    let ranked = scored;

    if (normalizedPeriod) {
      const sameCountryExact = scored.filter(
        (entry) =>
          entry.breakdown.countryScore === 1.0 &&
          entry.breakdown.periodScore === 1.0,
      );
      if (sameCountryExact.length > 0) {
        ranked = sameCountryExact;
      } else {
        const sameCountryClose = scored.filter(
          (entry) =>
            entry.breakdown.countryScore === 1.0 &&
            entry.breakdown.periodScore >= MIN_ACCEPTABLE_LOCAL_PERIOD_SCORE,
        );
        if (sameCountryClose.length > 0) {
          ranked = sameCountryClose;
        } else {
          const exactPeriodAnywhere = scored.filter(
            (entry) => entry.breakdown.periodScore === 1.0,
          );
          if (exactPeriodAnywhere.length > 0) {
            ranked = exactPeriodAnywhere;
          }
        }
      }
    }

    const best = ranked[0];
    const bestQuality = this.deriveMatchQuality(best.breakdown);

    // Check if period was relaxed: user selected a period but the best match
    // doesn't have an exact period match
    const periodRelaxed =
      Boolean(normalizedPeriod) && best.breakdown.periodScore < 1.0;

    // Build alternatives (top 5 excluding the best match)
    const alternatives: ArchetypeMatchAlternative[] = scored
      .slice(1, 6)
      .map((entry) => ({
        archetype: entry.archetype,
        matchQuality: this.deriveMatchQuality(entry.breakdown),
        score: entry.breakdown.total,
      }));

    return {
      archetype: best.archetype,
      detectedCountry,
      matchQuality: bestQuality,
      periodRelaxed,
      score: best.breakdown.total,
      scoreBreakdown: best.breakdown,
      alternatives,
    };
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
      floorHeight: bui.building.height,
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
        const refLocation = getReferenceLocationForCountry(archetype.country);
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
   * Get available construction periods for a given category.
   * When country is provided, returns only periods available in that country.
   * Falls back to all periods for the category when no local periods exist
   * (e.g. user is in a country not yet covered by archetypes), so the UI
   * never shows an empty dropdown.
   */
  async getAvailablePeriods(
    category: string,
    country?: string,
  ): Promise<PeriodAvailabilityResult> {
    const archetypes = await this.getArchetypes();
    const categoryArchetypes = archetypes.filter(
      (a) => a.category === category,
    );
    const normalizedCountry = normalizeCountryName(country) ?? null;
    const aliasNormalized =
      Boolean(country) &&
      Boolean(normalizedCountry) &&
      country!.trim() !== normalizedCountry;

    if (normalizedCountry) {
      const localArchetypes = categoryArchetypes.filter((archetype) =>
        countryNamesEqual(archetype.country, normalizedCountry),
      );
      const localPeriods = this.collectPeriods(localArchetypes);
      const localRecommendation = this.getRecommendedArchetype(
        localArchetypes,
        normalizedCountry,
      );

      // Only apply country filter when it yields results
      if (localArchetypes.length > 0 && localPeriods.length > 0) {
        return {
          periods: localPeriods,
          recommendedPeriod: localRecommendation
            ? extractConstructionPeriod(localRecommendation.name)
            : (localPeriods[0] ?? null),
          detectedCountry: normalizedCountry,
          sourceCountry: normalizedCountry,
          scope: "local",
          reason: aliasNormalized ? "normalized-country-alias" : null,
        };
      }

      if (localArchetypes.length > 0) {
        const fallbackRecommendation = this.getRecommendedArchetype(
          categoryArchetypes,
          normalizedCountry,
        );
        const fallbackPeriods = this.collectPeriods(categoryArchetypes);

        return {
          periods: fallbackPeriods,
          recommendedPeriod: fallbackRecommendation
            ? extractConstructionPeriod(fallbackRecommendation.name)
            : (fallbackPeriods[0] ?? null),
          detectedCountry: normalizedCountry,
          sourceCountry: fallbackRecommendation
            ? (normalizeCountryName(fallbackRecommendation.country) ??
              fallbackRecommendation.country)
            : null,
          scope: "fallback",
          reason: "no-local-periods",
        };
      }
      // Fall through to all-country periods below
    }

    const periods = this.collectPeriods(categoryArchetypes);
    const fallbackRecommendation = this.getRecommendedArchetype(
      categoryArchetypes,
      normalizedCountry,
    );

    return {
      periods,
      recommendedPeriod: fallbackRecommendation
        ? extractConstructionPeriod(fallbackRecommendation.name)
        : (periods[0] ?? null),
      detectedCountry: normalizedCountry,
      sourceCountry: fallbackRecommendation
        ? (normalizeCountryName(fallbackRecommendation.country) ??
          fallbackRecommendation.country)
        : null,
      scope: normalizedCountry ? "fallback" : "local",
      reason: normalizedCountry ? "no-local-archetypes" : null,
    };
  }

  /**
   * Count available archetypes matching criteria
   */
  async countMatchingArchetypes(
    category?: string,
    period?: string,
    country?: string,
  ): Promise<number> {
    let archetypes = await this.getArchetypes();
    const normalizedPeriod = normalizeConstructionPeriod(period);

    if (category) {
      archetypes = archetypes.filter((a) => a.category === category);
    }

    if (normalizedPeriod) {
      archetypes = archetypes.filter((a) => {
        const archetypePeriod = extractConstructionPeriod(a.name);
        return constructionPeriodsEqual(archetypePeriod, normalizedPeriod);
      });
    }

    if (country) {
      archetypes = archetypes.filter((archetype) =>
        countryNamesEqual(archetype.country, country),
      );
    }

    return archetypes.length;
  }

  /**
   * Get default building values for a country (deprecated).
   * Kept for older UI flows that still request legacy defaults.
   */
  getDefaultsForCountry(country: string): Partial<BuildingInfo> {
    const countryCode = getCountryCode(country);
    return countryCode ? (COUNTRY_DEFAULTS[countryCode] ?? {}) : {};
  }

  /**
   * Extract a representative U-value for a specific surface type.
   *
   * Wall surfaces in some archetypes (e.g. Greek) are named by orientation
   * ("Opaque north surface") rather than by the word "wall", so we match on
   * orientation keywords in addition to "wall".  This mirrors the detection
   * logic already used in applyThermalModification (archetypeModifier.ts).
   *
   * When multiple surfaces of the same type are present (common for windows
   * and walls), we return the area-weighted average U-value so the displayed
   * default is representative of the whole envelope rather than an arbitrary
   * first match.
   */
  private extractUValue(
    bui: BuildingPayload,
    type: "wall" | "roof" | "window",
  ): number {
    let surfaces: BuildingSurface[];

    if (type === "window") {
      surfaces = bui.building_surface.filter((s) => s.type === "transparent");
    } else if (type === "roof") {
      surfaces = bui.building_surface.filter(
        (s) => s.type === "opaque" && s.name.toLowerCase().includes("roof"),
      );
    } else {
      // Wall: match explicit "wall" name OR cardinal-orientation names.
      // Exclude roof and ground/slab surfaces to avoid false positives.
      surfaces = bui.building_surface.filter((s) => {
        const name = s.name.toLowerCase();
        return (
          s.type === "opaque" &&
          !name.includes("roof") &&
          !name.includes("slab") &&
          !name.includes("ground") &&
          (name.includes("wall") ||
            name.includes("north") ||
            name.includes("south") ||
            name.includes("east") ||
            name.includes("west"))
        );
      });
    }

    if (surfaces.length === 0) return 0;

    // Area-weighted average across all matched surfaces
    const totalArea = surfaces.reduce((sum, s) => sum + s.area, 0);
    if (totalArea === 0) return surfaces[0].u_value ?? 0;

    return surfaces.reduce((sum, s) => sum + s.u_value * s.area, 0) / totalArea;
  }
}

// Export singleton instance
export const buildingService = new BuildingService();
