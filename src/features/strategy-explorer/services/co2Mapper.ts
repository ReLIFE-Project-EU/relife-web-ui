import {
  RSE_EMISSION_ENERGY_SOURCES,
  RSE_FORECASTING_CO2_FIELD_PATHS,
  RSE_MVP_THERMAL_EMISSION_SOURCE,
} from "../constants.ts";
import type { RSEEmissionScenarioInput } from "../types";
import { resolveEmissionFactorCountry } from "../../../utils/emissionFactorCountry.ts";

/**
 * Walk a dotted path through a nested object; return undefined if any segment
 * is missing.
 */
function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (typeof current === "object" && current !== null && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

/**
 * Read a dotted path; return undefined when missing, but still throw on wrong
 * type.
 */
function readOptionalNumber(source: unknown, path: string): number | undefined {
  const value = readPath(source, path);

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric value at ${path}`);
  }

  return value;
}

/** Read a dotted path from an object; throw if the value is not a finite number. */
function readRequiredNumber(source: unknown, path: string): number {
  const value = readPath(source, path);

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric value at ${path}`);
  }

  return value;
}

/**
 * Map a single ECM scenario's energy results into CO2 emission inputs for the
 * Forecasting /calculate endpoint.
 *
 * @param scenarioResults - Per-scenario energy subtree (today
 *   `ECMScenario.results` from `/ecm_application`), i.e. the object tree that
 *   contains `primary_energy_uni11300` and optional `pv_hp`.  This is **not**
 *   the full multi-scenario ECM response.
 * @param options.scenarioNamePrefix - Prefix for stable `name` fields on each
 *   carrier row, e.g. `"baseline"` / `"renovated"`.
 * @param options.archetypeCountry - Archetype country code; will be resolved to
 *   the default emission-factor country when unsupported.
 * @returns Array of emission scenario inputs ready for Forecasting
 *   `/calculate`.
 *
 * @throws When the required thermal UNI field is missing or not a finite
 *   number.
 * @throws When an emitted `energy_source` is not in
 *   `RSE_EMISSION_ENERGY_SOURCES`.
 */
export function mapForecastingEnergyToEmissionScenarios(
  scenarioResults: unknown,
  options: { scenarioNamePrefix: string; archetypeCountry: string },
): RSEEmissionScenarioInput[] {
  const country = resolveEmissionFactorCountry(options.archetypeCountry);
  const prefix = options.scenarioNamePrefix;

  const thermalKwh = readRequiredNumber(
    scenarioResults,
    RSE_FORECASTING_CO2_FIELD_PATHS.thermalKwh,
  );

  const electricHeatFallbackKwh =
    readOptionalNumber(
      scenarioResults,
      RSE_FORECASTING_CO2_FIELD_PATHS.electricHeatFallbackKwh,
    ) ?? 0;

  const electricCoolFallbackKwh =
    readOptionalNumber(
      scenarioResults,
      RSE_FORECASTING_CO2_FIELD_PATHS.electricCoolFallbackKwh,
    ) ?? 0;

  const electricTotalKwh =
    readOptionalNumber(
      scenarioResults,
      RSE_FORECASTING_CO2_FIELD_PATHS.electricTotalKwh,
    ) ?? electricHeatFallbackKwh + electricCoolFallbackKwh;

  const pvSelfConsumption = readOptionalNumber(
    scenarioResults,
    RSE_FORECASTING_CO2_FIELD_PATHS.pvSelfConsumptionKwh,
  );

  const pvGridImport = readOptionalNumber(
    scenarioResults,
    RSE_FORECASTING_CO2_FIELD_PATHS.pvGridImportKwh,
  );

  const hasPvData =
    pvSelfConsumption !== undefined || pvGridImport !== undefined;
  const pvSelfConsumptionKwh = pvSelfConsumption ?? 0;
  const pvGridImportKwh = hasPvData
    ? (pvGridImport ?? 0) +
      Math.max(0, electricTotalKwh - pvSelfConsumptionKwh - (pvGridImport ?? 0))
    : electricTotalKwh;

  const inputs: RSEEmissionScenarioInput[] = [];

  if (thermalKwh > 0) {
    inputs.push({
      name: `${prefix}:thermal`,
      energy_source: RSE_MVP_THERMAL_EMISSION_SOURCE,
      annual_consumption_kwh: thermalKwh,
      country,
    });
  }

  if (pvGridImportKwh > 0) {
    inputs.push({
      name: `${prefix}:grid-electricity`,
      energy_source: "grid_electricity",
      annual_consumption_kwh: pvGridImportKwh,
      country,
    });
  }

  if (pvSelfConsumptionKwh > 0) {
    inputs.push({
      name: `${prefix}:pv-self-consumption`,
      energy_source: "solar_pv",
      annual_consumption_kwh: pvSelfConsumptionKwh,
      country,
    });
  }

  for (const input of inputs) {
    if (!RSE_EMISSION_ENERGY_SOURCES.includes(input.energy_source)) {
      throw new Error(`Unsupported CO2 energy source: ${input.energy_source}`);
    }
  }

  return inputs;
}
