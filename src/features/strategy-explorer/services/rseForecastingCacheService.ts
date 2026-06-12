import {
  buildRSECacheAvailability,
  rseCacheApi,
  type RSECacheAvailability,
  type RSECacheMatrixRequest,
  type RSEPublishedCacheVersion,
} from "../api/rseCacheApi";
import {
  RSE_MVP_PACKAGE_MEASURE_IDS,
  RSE_UNAVAILABLE_REASONS,
  type RSEUnavailableReason,
} from "../constants";
import type { ArchetypeDetails } from "../../../types/archetype";
import { extractUniTotals, getEPCClass } from "../../../services/energyUtils";
import {
  MEASURE_TO_ELEMENT,
  PV_MEASURE_ID,
} from "../../../services/renovationEcmParams";
import type { UNI11300Results } from "../../../types/forecasting";
import { extractCarrierSourceBreakdown } from "./rseCarrierSavingsService";
import type { RSEForecastingCacheEntry, RSESimulationResult } from "../types";

type RSECacheApiClient = {
  getPublishedVersion(): Promise<RSEPublishedCacheVersion>;
  listEntries(
    request: RSECacheMatrixRequest,
  ): Promise<RSEForecastingCacheEntry[]>;
};

const ENERGY_DELTA_EPSILON_KWH = 0.001;

export class RSEForecastingCacheServiceError extends Error {
  readonly reason: RSEUnavailableReason;

  constructor(message: string, reason: RSEUnavailableReason) {
    super(message);
    this.name = "RSEForecastingCacheServiceError";
    this.reason = reason;
    Object.setPrototypeOf(this, RSEForecastingCacheServiceError.prototype);
  }
}

export interface RSECacheMatrixResolution extends RSECacheAvailability {
  cacheVersion: string;
  entries: RSEForecastingCacheEntry[];
}

export function createRSEForecastingCacheService(
  api: RSECacheApiClient = rseCacheApi,
) {
  return {
    async resolveCacheMatrix(
      request: RSECacheMatrixRequest,
    ): Promise<RSECacheMatrixResolution> {
      const cacheVersion =
        request.cacheVersion ?? (await api.getPublishedVersion()).cacheVersion;
      const entries = await api.listEntries({ ...request, cacheVersion });
      const availability = buildRSECacheAvailability({
        archetypes: request.archetypes,
        packageIds: request.packageIds,
        cacheVersion,
        entries,
      });

      return {
        cacheVersion,
        entries,
        available: availability.available,
        missing: availability.missing,
      };
    },

    normalizeEntry(
      entry: RSEForecastingCacheEntry,
      details: ArchetypeDetails,
    ): RSESimulationResult {
      return normalizeEntry(entry, details);
    },
  };
}

export const rseForecastingCacheService = createRSEForecastingCacheService();

export function normalizeEntry(
  entry: RSEForecastingCacheEntry,
  details: ArchetypeDetails,
): RSESimulationResult {
  assertPositiveFinite(
    details.floorArea,
    "Archetype floor area must be available to derive the display EPC label.",
    RSE_UNAVAILABLE_REASONS.invalidFloorArea,
  );
  assertNonNegativeFinite(
    entry.baseline.annualEnergyKwh,
    "Baseline annual energy must be a non-negative finite number.",
  );
  assertNonNegativeFinite(
    entry.renovated.annualEnergyKwh,
    "Renovated annual energy must be a non-negative finite number.",
  );
  assertNonNegativeFinite(
    entry.baseline.co2.annualEmissionsTonCo2eq,
    "Baseline annual CO2 emissions must be a non-negative finite number.",
  );
  assertNonNegativeFinite(
    entry.renovated.co2.annualEmissionsTonCo2eq,
    "Renovated annual CO2 emissions must be a non-negative finite number.",
  );

  const baselineSystemEnergyKwh = extractSystemEnergyKwh(
    entry.baseline.primaryEnergyUni11300Summary,
  );
  const renovatedSystemEnergyKwh = extractSystemEnergyKwh(
    entry.renovated.primaryEnergyUni11300Summary,
  );
  const systemEnergySavingsKwh =
    baselineSystemEnergyKwh !== undefined &&
    renovatedSystemEnergyKwh !== undefined
      ? baselineSystemEnergyKwh - renovatedSystemEnergyKwh
      : undefined;
  const annualPrimaryEnergySavingsKwh =
    entry.baseline.annualEnergyKwh - entry.renovated.annualEnergyKwh;
  const annualCo2ReductionTon =
    entry.baseline.co2.annualEmissionsTonCo2eq -
    entry.renovated.co2.annualEmissionsTonCo2eq;

  if (
    isSystemOnlyPackage(entry.key.packageId) &&
    systemEnergySavingsKwh !== undefined &&
    Math.abs(systemEnergySavingsKwh) < ENERGY_DELTA_EPSILON_KWH
  ) {
    throw new RSEForecastingCacheServiceError(
      "System-only cache entry has identical baseline and renovated energy values.",
      RSE_UNAVAILABLE_REASONS.invalidCacheEntry,
    );
  }

  return {
    key: entry.key,
    archetype: entry.key.archetype,
    packageId: entry.key.packageId,
    cacheVersion: entry.key.cacheVersion,
    baselineAnnualEnergyKwh: entry.baseline.annualEnergyKwh,
    renovatedAnnualEnergyKwh: entry.renovated.annualEnergyKwh,
    annualEnergySavingsKwh: annualPrimaryEnergySavingsKwh,
    annualEnergySavingsPercentage: percentageSavings(
      entry.baseline.annualEnergyKwh,
      annualPrimaryEnergySavingsKwh,
    ),
    carrierSourceBreakdown: {
      baseline: extractCarrierSourceBreakdown(entry.baseline.co2),
      renovated: extractCarrierSourceBreakdown(entry.renovated.co2),
    },
    baselineAnnualEmissionsTonCo2eq: entry.baseline.co2.annualEmissionsTonCo2eq,
    renovatedAnnualEmissionsTonCo2eq:
      entry.renovated.co2.annualEmissionsTonCo2eq,
    annualCo2ReductionTon,
    annualCo2ReductionPercentage: percentageSavings(
      entry.baseline.co2.annualEmissionsTonCo2eq,
      annualCo2ReductionTon,
    ),
    baselineDisplayEpcClass: getEPCClass(
      entry.baseline.annualEnergyKwh / details.floorArea,
    ),
    renovatedDisplayEpcClass: getEPCClass(
      entry.renovated.annualEnergyKwh / details.floorArea,
    ),
    generatedAt: entry.generatedAt,
    provenance: entry.provenance,
  };
}

function percentageSavings(baseline: number, savings: number): number {
  return baseline > 0 ? (savings / baseline) * 100 : 0;
}

function extractSystemEnergyKwh(
  summary: Record<string, unknown>,
): number | undefined {
  return extractUniTotals({ summary } as UNI11300Results, {
    allowHeatPump: true,
  })?.deliveredTotal;
}

function isSystemOnlyPackage(
  packageId: RSEForecastingCacheEntry["key"]["packageId"],
): boolean {
  const measureIds = RSE_MVP_PACKAGE_MEASURE_IDS[packageId];

  return (
    measureIds?.length === 1 &&
    measureIds[0] !== PV_MEASURE_ID &&
    MEASURE_TO_ELEMENT[measureIds[0]] === undefined
  );
}

function assertPositiveFinite(
  value: number,
  message: string,
  reason: RSEUnavailableReason,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RSEForecastingCacheServiceError(message, reason);
  }
}

function assertNonNegativeFinite(value: number, message: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RSEForecastingCacheServiceError(
      message,
      RSE_UNAVAILABLE_REASONS.invalidCacheEntry,
    );
  }
}
