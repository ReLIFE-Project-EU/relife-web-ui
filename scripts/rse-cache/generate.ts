#!/usr/bin/env node
/**
 * Offline seed generator for the RSE forecasting cache.
 *
 * Calls the Forecasting service for every (archetype, package) tuple, builds
 * a cache payload (baseline, renovated, CO2 comparison, provenance), validates
 * it, and emits SQL (or writes directly to Supabase).  This is the write-side
 * counterpart to src/features/strategy-explorer/api/rseCacheApi.ts.
 */
import { writeFile } from "node:fs/promises";
import { Writable } from "node:stream";

import { createClient } from "@supabase/supabase-js";
import { Command, CommanderError } from "commander";
import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";
import pinoPretty from "pino-pretty";

import {
  RSE_CACHE_PAYLOAD_SCHEMA_VERSION,
  RSE_CO2_METHODS,
  RSE_FORECASTING_CO2_FIELD_PATHS,
  RSE_MVP_PACKAGE_MEASURE_IDS,
  RSE_MVP_THERMAL_EMISSION_SOURCE,
  RSE_PACKAGE_IDS,
  type RSEPackageId,
} from "../../src/features/strategy-explorer/constants.ts";
import { mapForecastingEnergyToEmissionScenarios } from "../../src/features/strategy-explorer/services/co2Mapper.ts";
import { resolveEmissionFactorCountry } from "../../src/features/strategy-explorer/utils/emissionFactorCountry.ts";
import type {
  RSEArchetypeRef,
  RSEEmissionComparisonSnapshot,
  RSEEmissionResult,
  RSEEmissionScenarioInput,
  RSEForecastingCacheEntry,
  RSEForecastingScenarioSnapshot,
} from "../../src/features/strategy-explorer/types.ts";
import { getEPCClass } from "../../src/services/energyUtils.ts";
import { buildECMParams } from "../../src/services/renovationEcmParams.ts";
import type {
  ArchetypeInfo,
  ECMApplicationParams,
  ECMApplicationResponse,
  ECMScenario,
} from "../../src/types/forecasting.ts";

const UNIT_SEPARATOR = "\u001f";
const RSE_SEED_LOGGED_ERRORS = new WeakSet<object>();
const RSE_SEED_LOG_LEVELS = [
  "debug",
  "info",
  "warn",
  "error",
  "silent",
] as const;

type RSESeedLogLevel = (typeof RSE_SEED_LOG_LEVELS)[number];
type RSESeedLogFields = Record<string, unknown>;

const RSE_SEED_LOG_FORMATS = ["json", "pretty", "auto"] as const;
type RSESeedLogFormat = (typeof RSE_SEED_LOG_FORMATS)[number];
type RSESeedResolvedLogFormat = "json" | "pretty";

/** Default stderr sink for CLI runs (stable reference for TTY / format detection). */
function defaultSeedStderr(text: string): void {
  process.stderr.write(text);
}

export interface RSESeedLogger {
  debug: (event: string, message: string, fields?: RSESeedLogFields) => void;
  info: (event: string, message: string, fields?: RSESeedLogFields) => void;
  warn: (event: string, message: string, fields?: RSESeedLogFields) => void;
  error: (event: string, message: string, fields?: RSESeedLogFields) => void;
  child?: (fields: RSESeedLogFields) => RSESeedLogger;
}

const createSilentSeedLogger = (): RSESeedLogger => {
  const logger: RSESeedLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => logger,
  };

  return logger;
};

/** Archetype reference plus the floor area required by the ECM simulator. */
export interface RSESeedArchetype extends RSEArchetypeRef {
  floorArea: number;
}

/** One cell in the cache matrix: a single (archetype, package) combination. */
export interface RSESeedTarget {
  archetype: RSESeedArchetype;
  packageId: RSEPackageId;
}

/** Row shape for public.rse_cache_versions (snake_case to match the table). */
export interface RSESeedVersionRow {
  cache_version: string;
  status: "draft" | "published";
  description: string | null;
  generated_by: "offline-pipeline";
  forecasting_service_version: string | null;
  co2_method: (typeof RSE_CO2_METHODS)[number];
}

/** Row shape for public.rse_forecasting_cache_entries. */
export interface RSESeedEntryRow {
  cache_version: string;
  archetype_country: string;
  archetype_category: string;
  archetype_name: string;
  package_id: RSEPackageId;
  payload_schema_version: typeof RSE_CACHE_PAYLOAD_SCHEMA_VERSION;
  payload: RSEForecastingCachePayload;
}

/** The JSONB payload stored in each cache entry. */
export interface RSEForecastingCachePayload {
  baseline: RSEForecastingScenarioSnapshot;
  renovated: RSEForecastingScenarioSnapshot;
  co2Comparison: RSEEmissionComparisonSnapshot;
  provenance: RSEForecastingCacheEntry["provenance"];
}

/** Output of the generator: version row, entry rows, and ready-to-run SQL. */
export interface RSEGeneratedSeed {
  version: RSESeedVersionRow;
  entries: RSESeedEntryRow[];
  sql: string;
}

/** Options passed to the generator from the CLI or a test fixture. */
export interface RSESeedGeneratorOptions {
  cacheVersion: string;
  targets: RSESeedTarget[];
  generatedAt: string;
  forecastingServiceVersion?: string;
  description?: string;
  publish?: boolean;
  logger?: RSESeedLogger;
}

/** Thin abstraction over the Forecasting service so tests can inject mocks. */
export interface RSEForecastingSeedClient {
  listArchetypes(): Promise<ArchetypeInfo[]>;
  getArchetypeDetails(
    archetype: RSEArchetypeRef,
  ): Promise<{ bui: unknown; system: unknown }>;
  simulateECM(params: ECMApplicationParams): Promise<ECMApplicationResponse>;
  calculateEmissions(
    input: RSEEmissionScenarioInput,
  ): Promise<RSEEmissionResult>;
}

export interface RSESeedCliDeps {
  env: Record<string, string | undefined>;
  stdout: (text: string) => void;
  stderr?: (text: string) => void;
  writeFile: (path: string, contents: string) => Promise<void>;
  applySeed: (
    generated: RSEGeneratedSeed,
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<void>;
  verifySupabase?: (
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<void>;
  makeForecastingClient: (
    baseUrl: string,
    logger?: RSESeedLogger,
  ) => RSEForecastingSeedClient;
  now: () => Date;
}

/** Orchestrate the full seed generation pipeline:
 *  1. Simulate ECM for each (archetype, package) via the Forecasting service.
 *  2. Build and validate the cache payload.
 *  3. Emit version + entries + upsert SQL.
 *
 *  Throws on duplicate targets, simulation failures, or validation errors. */
export async function generateRSECacheSeedSql(
  options: RSESeedGeneratorOptions,
  forecastingClient: RSEForecastingSeedClient,
): Promise<RSEGeneratedSeed> {
  const entries: RSESeedEntryRow[] = [];
  const targetKeys = new Set<string>();
  const logger = options.logger ?? createSilentSeedLogger();
  const targetTotal = options.targets.length;

  for (const [index, target] of options.targets.entries()) {
    const targetIndex = index + 1;
    const targetStartedAt = Date.now();
    const key = targetKey(target);
    const targetFields = {
      ...targetLogFields(target),
      targetIndex,
      targetTotal,
    };
    const targetLogger = childSeedLogger(logger, targetFields);

    if (targetKeys.has(key)) {
      throw new Error(`Duplicate seed target: ${key}`);
    }
    targetKeys.add(key);

    const measureIds = RSE_MVP_PACKAGE_MEASURE_IDS[target.packageId];
    targetLogger.debug("seed.target.start", "Generating seed target", {
      measureIds,
    });
    const ecmParams = {
      ...buildECMParams(measureIds, {
        kind: "archetype",
        archetype: target.archetype,
        floorArea: target.archetype.floorArea,
      }),
      include_baseline: true,
    };
    targetLogger.debug(
      "forecasting.ecm.request_summary",
      "ECM request summary",
      {
        measureIds,
        includeBaseline: true,
        source: "archetype",
        floorArea: target.archetype.floorArea,
      },
    );
    const ecmResponse = await forecastingClient.simulateECM(ecmParams);
    const payload = await buildPayload({
      target,
      generatedAt: options.generatedAt,
      forecastingServiceVersion: options.forecastingServiceVersion,
      ecmResponse,
      forecastingClient,
      logger: targetLogger,
    });

    entries.push({
      cache_version: options.cacheVersion,
      archetype_country: target.archetype.country,
      archetype_category: target.archetype.category,
      archetype_name: target.archetype.name,
      package_id: target.packageId,
      payload_schema_version: RSE_CACHE_PAYLOAD_SCHEMA_VERSION,
      payload,
    });

    targetLogger.debug("seed.target.success", "Generated seed target", {
      elapsedMs: Date.now() - targetStartedAt,
      entryCount: entries.length,
    });

    if (targetIndex % 25 === 0 || targetIndex === targetTotal) {
      logger.debug("seed.generate.progress", "RSE cache seed progress", {
        completedTargets: targetIndex,
        targetTotal,
      });
    }
  }

  const version: RSESeedVersionRow = {
    cache_version: options.cacheVersion,
    status: options.publish ? "published" : "draft",
    description: options.description ?? null,
    generated_by: "offline-pipeline",
    forecasting_service_version: options.forecastingServiceVersion ?? null,
    co2_method: RSE_CO2_METHODS[0],
  };

  return {
    version,
    entries,
    sql: renderSeedSql(version, entries, options.publish ?? false),
  };
}

/** Turn one ECM response into a full cache payload:
 *  pick baseline/renovated scenarios, build carrier-split CO2 inputs, calculate
 *  per-carrier emissions through Forecasting, then cross-check aggregate savings. */
async function buildPayload(params: {
  target: RSESeedTarget;
  generatedAt: string;
  forecastingServiceVersion?: string;
  ecmResponse: ECMApplicationResponse;
  forecastingClient: RSEForecastingSeedClient;
  logger: RSESeedLogger;
}): Promise<RSEForecastingCachePayload> {
  const baselineScenario = pickBaselineScenario(params.ecmResponse);
  const renovatedScenario = pickRenovatedScenario(params.ecmResponse);

  params.logger.debug(
    "forecasting.ecm.response_summary",
    "ECM response summary",
    {
      scenarioCount: params.ecmResponse.scenarios.length,
      baselineScenarioId: baselineScenario.scenario_id,
      renovatedScenarioId: renovatedScenario.scenario_id,
    },
  );

  const baselineInputs = mapForecastingEnergyToEmissionScenarios(
    baselineScenario.results,
    {
      scenarioNamePrefix: "baseline",
      archetypeCountry: params.target.archetype.country,
    },
  );
  const renovatedInputs = mapForecastingEnergyToEmissionScenarios(
    renovatedScenario.results,
    {
      scenarioNamePrefix: "renovated",
      archetypeCountry: params.target.archetype.country,
    },
  );
  params.logger.debug("co2.inputs.summary", "CO2 input summary", {
    scenario: "baseline",
    carrierCount: baselineInputs.length,
    carriers: summarizeCo2Inputs(baselineInputs),
  });
  params.logger.debug("co2.inputs.summary", "CO2 input summary", {
    scenario: "renovated",
    carrierCount: renovatedInputs.length,
    carriers: summarizeCo2Inputs(renovatedInputs),
  });
  const [baselineComponents, renovatedComponents] = await Promise.all([
    calculateEmissionComponents(
      baselineInputs,
      params.forecastingClient,
      childSeedLogger(params.logger, { scenario: "baseline" }),
    ),
    calculateEmissionComponents(
      renovatedInputs,
      params.forecastingClient,
      childSeedLogger(params.logger, { scenario: "renovated" }),
    ),
  ]);

  const baseline = toScenarioSnapshot(
    baselineScenario,
    baselineInputs,
    params.target.archetype.floorArea,
    baselineComponents,
  );
  const renovated = toScenarioSnapshot(
    renovatedScenario,
    renovatedInputs,
    params.target.archetype.floorArea,
    renovatedComponents,
  );
  const co2Comparison = toComparisonSnapshot(baseline, renovated);

  validatePayload(baseline, renovated, co2Comparison);
  params.logger.debug("co2.results.summary", "CO2 result summary", {
    baselineAnnualConsumptionKwh: baseline.co2.annualConsumptionKwh,
    renovatedAnnualConsumptionKwh: renovated.co2.annualConsumptionKwh,
    baselineAnnualEmissionsKgCo2eq: baseline.co2.annualEmissionsKgCo2eq,
    renovatedAnnualEmissionsKgCo2eq: renovated.co2.annualEmissionsKgCo2eq,
    savingsKgCo2eq: co2Comparison.savings.absoluteKgCo2eq,
    savingsPercentage: co2Comparison.savings.percentage,
  });
  params.logger.debug(
    "seed.payload.validation_success",
    "RSE cache payload validated",
  );

  return {
    baseline,
    renovated,
    co2Comparison,
    provenance: {
      source: "offline-pipeline",
      forecastingServiceVersion: params.forecastingServiceVersion,
      co2ComputedAt: params.generatedAt,
      co2Method: RSE_CO2_METHODS[0],
      emissionFactorCountry: resolveEmissionFactorCountry(
        params.target.archetype.country,
      ),
      notes: "Generated by scripts/rse-cache/generate.ts",
    },
  };
}

/** Require the explicit baseline scenario requested for RSE cache generation. */
function pickBaselineScenario(response: ECMApplicationResponse): ECMScenario {
  const scenario = response.scenarios.find((item) =>
    item.scenario_id.toLowerCase().includes("baseline"),
  );

  if (!scenario) {
    throw new Error(
      "Forecasting ECM response did not include a baseline scenario",
    );
  }

  return scenario;
}

/** Assume the last non-baseline scenario is the fully-renovated one. */
function pickRenovatedScenario(response: ECMApplicationResponse): ECMScenario {
  const scenario = response.scenarios
    .filter((item) => !item.scenario_id.toLowerCase().includes("baseline"))
    .at(-1);

  if (!scenario) {
    throw new Error(
      "Forecasting ECM response did not include a renovated scenario",
    );
  }

  return scenario;
}

async function calculateEmissionComponents(
  inputs: RSEEmissionScenarioInput[],
  forecastingClient: RSEForecastingSeedClient,
  logger: RSESeedLogger,
): Promise<RSEEmissionResult[]> {
  return Promise.all(
    inputs.map(async (input) => {
      const startedAt = Date.now();

      logger.debug("co2.calculate.start", "Calculating CO2 component", {
        inputName: input.name,
        energySource: input.energy_source,
        annualConsumptionKwh: input.annual_consumption_kwh,
        country: input.country,
      });

      const component = await forecastingClient.calculateEmissions(input);

      logger.debug("co2.calculate.success", "Calculated CO2 component", {
        inputName: input.name,
        energySource: input.energy_source,
        annualConsumptionKwh: component.annual_consumption_kwh,
        annualEmissionsKgCo2eq: component.annual_emissions_kg_co2eq,
        emissionFactorKgPerKwh: component.emission_factor_kg_per_kwh,
        elapsedMs: Date.now() - startedAt,
      });

      return component;
    }),
  );
}

/** Convert a single ECM scenario plus its CO2 comparison results into the
 *  snapshot shape stored in the cache payload.  Computes the display EPC class
 *  from annual energy per floor area and aggregates CO2 metrics from components. */
function toScenarioSnapshot(
  scenario: ECMScenario,
  co2Inputs: RSEEmissionScenarioInput[],
  floorArea: number,
  co2Components: RSEEmissionResult[],
): RSEForecastingScenarioSnapshot {
  const summary = requirePrimaryEnergySummary(scenario);
  const annualEnergyKwh =
    readOptionalNumber(
      scenario,
      "results.primary_energy_uni11300.summary.EP_total_kWh",
    ) ??
    readRequiredNumber(
      scenario.results,
      RSE_FORECASTING_CO2_FIELD_PATHS.thermalKwh,
    ) +
      (readOptionalNumber(
        scenario.results,
        RSE_FORECASTING_CO2_FIELD_PATHS.electricTotalKwh,
      ) ?? 0);
  const annualConsumptionKwh = roundTo(
    co2Inputs.reduce((total, input) => total + input.annual_consumption_kwh, 0),
    2,
  );
  const annualEmissionsKgCo2eq = roundTo(
    co2Components.reduce(
      (total, component) => total + component.annual_emissions_kg_co2eq,
      0,
    ),
    2,
  );
  const annualEmissionsTonCo2eq = roundTo(annualEmissionsKgCo2eq / 1_000, 3);
  const weightedEmissionFactorKgPerKwh = roundTo(
    annualConsumptionKwh > 0
      ? annualEmissionsKgCo2eq / annualConsumptionKwh
      : 0,
    4,
  );

  return {
    annualEnergyKwh,
    displayEpcClass: getEPCClass(annualEnergyKwh / floorArea),
    primaryEnergyUni11300Summary: summary,
    pvHpSummary: readOptionalRecord(scenario, "results.pv_hp.summary"),
    co2Inputs,
    co2Components,
    co2: {
      annualConsumptionKwh,
      annualEmissionsKgCo2eq,
      annualEmissionsTonCo2eq,
      weightedEmissionFactorKgPerKwh,
      equivalentTrees: Math.trunc(annualEmissionsKgCo2eq / 21),
      equivalentKmCar:
        annualEmissionsKgCo2eq > 0
          ? Math.trunc(annualEmissionsKgCo2eq / 0.12)
          : 0,
      sourceBreakdownKwh: {
        naturalGas: roundTo(sumInputs(co2Inputs, "natural_gas"), 2),
        gridElectricity: roundTo(sumInputs(co2Inputs, "grid_electricity"), 2),
        solarPv: roundTo(sumInputs(co2Inputs, "solar_pv"), 2),
      },
      thermalEmissionSource: RSE_MVP_THERMAL_EMISSION_SOURCE,
    },
  };
}

function toComparisonSnapshot(
  baseline: RSEForecastingScenarioSnapshot,
  renovated: RSEForecastingScenarioSnapshot,
): RSEEmissionComparisonSnapshot {
  const baselineEmissions = baseline.co2.annualEmissionsKgCo2eq;
  const renovatedEmissions = renovated.co2.annualEmissionsKgCo2eq;
  const absoluteKgCo2eq = roundTo(baselineEmissions - renovatedEmissions, 2);

  return {
    baselineAnnualEmissionsKgCo2eq: baselineEmissions,
    renovatedAnnualEmissionsKgCo2eq: renovatedEmissions,
    savings: {
      absoluteKgCo2eq,
      absoluteTonCo2eq: roundTo(absoluteKgCo2eq / 1_000, 3),
      percentage: roundTo(
        baselineEmissions > 0 ? (absoluteKgCo2eq / baselineEmissions) * 100 : 0,
        1,
      ),
    },
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Guard against corrupt or inconsistent data before it reaches the cache.
 *  Checks: (1) no negative or non-finite numbers, (2) reported savings match
 *  baseline minus renovated within a small tolerance. */
function validatePayload(
  baseline: RSEForecastingScenarioSnapshot,
  renovated: RSEForecastingScenarioSnapshot,
  co2Comparison: RSEEmissionComparisonSnapshot,
): void {
  const values = [
    baseline.annualEnergyKwh,
    renovated.annualEnergyKwh,
    baseline.co2.annualEmissionsKgCo2eq,
    renovated.co2.annualEmissionsKgCo2eq,
    co2Comparison.savings.absoluteKgCo2eq,
  ];

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error(
      "RSE cache payload contains invalid negative or non-finite values",
    );
  }

  const computedSavings =
    baseline.co2.annualEmissionsKgCo2eq - renovated.co2.annualEmissionsKgCo2eq;
  const toleranceKgCo2eq = 0.01;

  if (
    Math.abs(computedSavings - co2Comparison.savings.absoluteKgCo2eq) >
    toleranceKgCo2eq
  ) {
    throw new Error(
      "CO2 savings do not match baseline minus renovated emissions",
    );
  }
}

type SqlColumn<Row> = Extract<keyof Row, string>;
type SqlSerializers<Row> = {
  [Column in SqlColumn<Row>]: (value: Row[Column]) => string;
};

interface SqlTableDescriptor<Row extends object> {
  table: string;
  columns: readonly SqlColumn<Row>[];
  serializers: SqlSerializers<Row>;
  conflictColumns: readonly SqlColumn<Row>[];
  updateColumns?: readonly SqlColumn<Row>[];
}

const RSE_CACHE_VERSION_TABLE = {
  table: "public.rse_cache_versions",
  columns: [
    "cache_version",
    "status",
    "description",
    "generated_by",
    "forecasting_service_version",
    "co2_method",
  ],
  serializers: {
    cache_version: sqlString,
    status: sqlString,
    description: sqlNullableString,
    generated_by: sqlString,
    forecasting_service_version: sqlNullableString,
    co2_method: sqlString,
  },
  conflictColumns: ["cache_version"],
  updateColumns: [
    "status",
    "description",
    "generated_by",
    "forecasting_service_version",
    "co2_method",
  ],
} as const satisfies SqlTableDescriptor<RSESeedVersionRow>;

const RSE_CACHE_ENTRY_TABLE = {
  table: "public.rse_forecasting_cache_entries",
  columns: [
    "cache_version",
    "archetype_country",
    "archetype_category",
    "archetype_name",
    "package_id",
    "payload_schema_version",
    "payload",
  ],
  serializers: {
    cache_version: sqlString,
    archetype_country: sqlString,
    archetype_category: sqlString,
    archetype_name: sqlString,
    package_id: sqlString,
    payload_schema_version: sqlInteger,
    payload: sqlJson,
  },
  conflictColumns: [
    "cache_version",
    "archetype_country",
    "archetype_category",
    "archetype_name",
    "package_id",
  ],
  updateColumns: ["payload_schema_version", "payload"],
} as const satisfies SqlTableDescriptor<RSESeedEntryRow>;

/** Produce an idempotent SQL script that upserts the version row and all
 *  entry rows, then optionally publishes the version. SQL output is kept for
 *  admin/manual seed workflows; typed column lists keep it aligned with --apply. */
function renderSeedSql(
  version: RSESeedVersionRow,
  entries: RSESeedEntryRow[],
  publish: boolean,
): string {
  const lines = [
    "-- RSE forecasting cache seed",
    "-- Generated by relife-web-ui/scripts/rse-cache/generate.ts",
    "BEGIN;",
    "",
    renderInsert({
      ...RSE_CACHE_VERSION_TABLE,
      row: version,
    }),
    "",
  ];

  for (const entry of entries) {
    lines.push(
      renderInsert({
        ...RSE_CACHE_ENTRY_TABLE,
        row: entry,
      }),
    );
  }

  if (publish) {
    lines.push(
      "",
      `UPDATE public.rse_cache_versions SET status = 'published', published_at = NOW() WHERE cache_version = ${sqlString(version.cache_version)};`,
    );
  } else {
    lines.push(
      "",
      `-- Publish explicitly after validation:`,
      `-- UPDATE public.rse_cache_versions SET status = 'published', published_at = NOW() WHERE cache_version = ${sqlString(version.cache_version)};`,
    );
  }

  lines.push("", "COMMIT;", "");
  return lines.join("\n");
}

function createSupabaseClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Quick connectivity/auth check. Ignores missing-table errors (42P01) so
 *  the check works even before migrations are run. */
async function verifySupabase(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const client = createSupabaseClient(supabaseUrl, serviceRoleKey);
  const { error } = await client
    .from("rse_cache_versions")
    .select("cache_version", { head: true })
    .limit(1);

  if (error && error.code !== "42P01") {
    throw new Error(`Supabase connectivity check failed: ${error.message}`);
  }
}

/** Write the generated seed directly to Supabase using a service-role client.
 *  Only used when the --apply CLI flag is passed; otherwise SQL is emitted to stdout/file. */
async function applySeed(
  generated: RSEGeneratedSeed,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const client = createSupabaseClient(supabaseUrl, serviceRoleKey);

  const { error: versionError } = await client
    .from("rse_cache_versions")
    .upsert(generated.version, { onConflict: "cache_version" });

  if (versionError) {
    throw versionError;
  }

  const { error: entriesError } = await client
    .from("rse_forecasting_cache_entries")
    .upsert(generated.entries, {
      onConflict:
        "cache_version,archetype_country,archetype_category,archetype_name,package_id",
    });

  if (entriesError) {
    throw entriesError;
  }

  if (generated.version.status === "published") {
    const { error: publishError } = await client
      .from("rse_cache_versions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("cache_version", generated.version.cache_version);

    if (publishError) {
      throw publishError;
    }
  }
}

function requirePrimaryEnergySummary(
  scenario: ECMScenario,
): Record<string, unknown> {
  return readRequiredRecord(
    scenario.results,
    "primary_energy_uni11300.summary",
  );
}

/** Read a dotted path from an object; throw if the value is not a finite number. */
function readRequiredNumber(source: unknown, path: string): number {
  return readNumber(source, path, "required");
}

/** Read a dotted path; return undefined when missing, but still throw on wrong type. */
function readOptionalNumber(source: unknown, path: string): number | undefined {
  return readNumber(source, path, "optional");
}

function readNumber(source: unknown, path: string, mode: "required"): number;
function readNumber(
  source: unknown,
  path: string,
  mode: "optional",
): number | undefined;
function readNumber(
  source: unknown,
  path: string,
  mode: "required" | "optional",
): number | undefined {
  const value = readPath(source, path);

  if (mode === "optional" && (value === undefined || value === null)) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric value at ${path}`);
  }

  return value;
}

/** Read a dotted path; throw if the value is not a plain object. */
function readRequiredRecord(
  source: unknown,
  path: string,
): Record<string, unknown> {
  return readRecord(source, path, "required");
}

function readOptionalRecord(
  source: unknown,
  path: string,
): Record<string, unknown> | undefined {
  return readRecord(source, path, "optional");
}

function readRecord(
  source: unknown,
  path: string,
  mode: "required",
): Record<string, unknown>;
function readRecord(
  source: unknown,
  path: string,
  mode: "optional",
): Record<string, unknown> | undefined;
function readRecord(
  source: unknown,
  path: string,
  mode: "required" | "optional",
): Record<string, unknown> | undefined {
  const value = readPath(source, path);

  if (mode === "optional" && (value === undefined || value === null)) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`Expected object value at ${path}`);
  }

  return value;
}

/** Walk a dotted path through a nested object; return undefined if any segment is missing. */
function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, source);
}

/** Narrow a value to a plain object (not null, not array). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sum consumption for a single energy source across all inputs. */
function sumInputs(
  inputs: RSEEmissionScenarioInput[],
  energySource: RSEEmissionScenarioInput["energy_source"],
): number {
  return inputs
    .filter((input) => input.energy_source === energySource)
    .reduce((total, input) => total + input.annual_consumption_kwh, 0);
}

/** Escape a string for PostgreSQL single-quoted literals. */
function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNullableString(value: string | null): string {
  return value === null ? "NULL" : sqlString(value);
}

function sqlInteger(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(`Expected integer SQL value, received ${value}`);
  }

  return String(value);
}

/** Serialize a value to a JSONB literal safe for SQL. */
function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function renderInsert<
  Row extends object,
  Column extends SqlColumn<Row>,
>(params: {
  table: string;
  row: Row;
  columns: readonly Column[];
  serializers: Pick<SqlSerializers<Row>, Column>;
  conflictColumns: readonly Column[];
  updateColumns?: readonly Column[];
}): string {
  const values = params.columns.map((column) =>
    params.serializers[column](params.row[column]),
  );
  const conflictAction =
    params.updateColumns && params.updateColumns.length > 0
      ? `DO UPDATE SET ${params.updateColumns
          .map((column) => `${column} = EXCLUDED.${column}`)
          .join(", ")}`
      : "DO NOTHING";

  return `INSERT INTO ${params.table} (${params.columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (${params.conflictColumns.join(", ")}) ${conflictAction};`;
}

/** Unique key for deduplicating targets during generation. */
function targetKey(target: RSESeedTarget): string {
  return [
    target.archetype.country,
    target.archetype.category,
    target.archetype.name,
    target.packageId,
  ].join(UNIT_SEPARATOR);
}

function targetLogFields(target: RSESeedTarget): RSESeedLogFields {
  return {
    archetypeCountry: target.archetype.country,
    archetypeCategory: target.archetype.category,
    archetypeName: target.archetype.name,
    packageId: target.packageId,
  };
}

function summarizeArchetypes(archetypes: ArchetypeInfo[]): RSESeedLogFields {
  return {
    archetypeCount: archetypes.length,
    countries: [...new Set(archetypes.map((item) => item.country))].sort(),
    categories: [...new Set(archetypes.map((item) => item.category))].sort(),
    sample: archetypes.slice(0, 5).map((item) => ({
      country: item.country,
      category: item.category,
      name: item.name,
    })),
  };
}

function summarizeCo2Inputs(inputs: RSEEmissionScenarioInput[]): Array<{
  name: string;
  energySource: RSEEmissionScenarioInput["energy_source"];
  annualConsumptionKwh: number;
}> {
  return inputs.map((input) => ({
    name: input.name,
    energySource: input.energy_source,
    annualConsumptionKwh: input.annual_consumption_kwh,
  }));
}

/** Parse comma-separated package IDs; default to all packages when omitted. */
function parsePackageIds(value: string | undefined): RSEPackageId[] {
  if (!value) {
    return [...RSE_PACKAGE_IDS];
  }

  const packageIds = value.split(",").map((item) => item.trim());

  for (const packageId of packageIds) {
    if (!RSE_PACKAGE_IDS.includes(packageId as RSEPackageId)) {
      throw new Error(`Unsupported RSE package id: ${packageId}`);
    }
  }

  return packageIds as RSEPackageId[];
}

/** Parse the --archetypes CLI argument from JSON and validate identifier fields. */
function parseArchetypes(value: string | undefined): RSEArchetypeRef[] {
  if (!value) {
    throw new Error("--archetypes JSON is required");
  }

  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("--archetypes must be a JSON array");
  }

  return parsed.map((item) => {
    const allowedKeys = ["category", "country", "name"];

    if (
      !isRecord(item) ||
      typeof item.country !== "string" ||
      typeof item.category !== "string" ||
      typeof item.name !== "string" ||
      Object.keys(item).some((key) => !allowedKeys.includes(key))
    ) {
      throw new Error(
        "--archetypes entries must include only country, category, and name",
      );
    }

    return {
      country: item.country,
      category: item.category,
      name: item.name,
    };
  });
}

/** Resolve seed archetypes from an explicit JSON override, or discover all
 *  supported archetypes from Forecasting and fetch their floor areas. */
export async function resolveSeedArchetypes(
  value: string | undefined,
  forecastingClient: RSEForecastingSeedClient,
  preloadedArchetypes?: ArchetypeInfo[],
  logger: RSESeedLogger = createSilentSeedLogger(),
): Promise<RSESeedArchetype[]> {
  const archetypes =
    value !== undefined
      ? parseArchetypes(value)
      : (preloadedArchetypes ?? (await forecastingClient.listArchetypes()));

  if (value !== undefined) {
    logger.debug("archetypes.override.summary", "Using explicit archetypes", {
      archetypeCount: archetypes.length,
      sample: archetypes.slice(0, 5).map((item) => ({
        country: item.country,
        category: item.category,
        name: item.name,
      })),
    });
  } else {
    logger.debug(
      "archetypes.discovery.summary",
      "Discovered Forecasting archetypes",
      summarizeArchetypes(archetypes),
    );
  }

  const resolved = await Promise.all(
    archetypes.map(async (archetype) => {
      const startedAt = Date.now();

      logger.debug("archetypes.details.start", "Fetching archetype details", {
        country: archetype.country,
        category: archetype.category,
        name: archetype.name,
      });

      const details = await forecastingClient.getArchetypeDetails(archetype);
      const floorArea = readPath(details.bui, "building.net_floor_area");

      if (
        typeof floorArea !== "number" ||
        !Number.isFinite(floorArea) ||
        floorArea <= 0
      ) {
        throw new Error(
          `Forecasting archetype ${archetype.country}/${archetype.category}/${archetype.name} is missing a positive bui.building.net_floor_area`,
        );
      }

      logger.debug(
        "archetypes.details.success",
        "Resolved archetype floor area",
        {
          country: archetype.country,
          category: archetype.category,
          name: archetype.name,
          floorArea,
          elapsedMs: Date.now() - startedAt,
        },
      );

      return {
        ...archetype,
        floorArea,
      };
    }),
  );

  return resolved;
}

interface RSESeedCliOptions {
  cacheVersion: string;
  forecastingBaseUrl?: string;
  archetypes?: string;
  packages: RSEPackageId[];
  out?: string;
  description?: string;
  forecastingServiceVersion?: string;
  publish: boolean;
  apply: boolean;
  dryRun: boolean;
  logLevel?: RSESeedLogLevel;
  logFormat?: RSESeedLogFormat;
}

function parseCliOptions(
  argv: string[],
  deps: Pick<RSESeedCliDeps, "stdout" | "stderr">,
): RSESeedCliOptions | null {
  const program = buildCliProgram(deps);

  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) {
      return null;
    }

    throw error;
  }

  return program.opts<RSESeedCliOptions>();
}

function buildCliProgram(
  deps: Pick<RSESeedCliDeps, "stdout" | "stderr">,
): Command {
  return new Command()
    .name("rse-seed")
    .description("RSE forecasting cache seed generator")
    .usage("--cache-version <version> --forecasting-base-url <url> [options]")
    .exitOverride()
    .configureOutput({
      writeOut: deps.stdout,
      writeErr: deps.stderr ?? (() => undefined),
    })
    .allowExcessArguments(false)
    .requiredOption(
      "--cache-version <version>",
      "Cache batch identifier, for example 2026-05-12.it-demo.",
    )
    .option(
      "--forecasting-base-url <url>",
      "Absolute Forecasting/API base URL. If omitted, absolute VITE_API_URL is used.",
    )
    .option(
      "--archetypes <json>",
      "JSON array override with country, category, and name.",
    )
    .option(
      "--packages <ids>",
      "Comma-separated package ids. Defaults to all RSE packages.",
      parsePackageIds,
      [...RSE_PACKAGE_IDS],
    )
    .option("--out <path>", "Write generated SQL to a file instead of stdout.")
    .option(
      "--description <text>",
      "Store a description on the cache version row.",
    )
    .option(
      "--forecasting-service-version <id>",
      "Optional provenance label you choose (e.g. git tag, image tag, release id). Stored on the cache version row and copied into each entry payload provenance; not read from the Forecasting API and does not affect simulations. Omit for NULL / omitted field.",
    )
    .option("--publish", "Mark generated SQL/applied rows as published.", false)
    .option(
      "--apply",
      "Apply directly to Supabase after generating SQL.",
      false,
    )
    .option(
      "--dry-run",
      "Validate generation and print a summary without writing files or Supabase rows.",
      false,
    )
    .option(
      "--log-level <level>",
      "Structured log level: debug, info, warn, error, or silent. Defaults to info.",
      parseLogLevel,
    )
    .option(
      "--log-format <format>",
      "stderr log rendering: json (JSON Lines), pretty (human-readable), or auto (pretty when stderr is a TTY).",
      parseLogFormat,
    )
    .addHelpText(
      "after",
      `

Logging:
  Logs go to stderr; SQL and dry-run summaries stay on stdout.
  With --log-format auto (default when omitted), JSON Lines are used unless stderr is a TTY, then pino-pretty is used.
  RSE_SEED_LOG_LEVEL sets the default log level; --log-level takes precedence.
  RSE_SEED_LOG_FORMAT sets the default log format when --log-format is omitted (json, pretty, or auto).

Provenance:
  --forecasting-service-version  Optional string you supply for traceability only (e.g. Forecasting repo tag, container
                                   digest, or build id). The generator does not fetch it from the Forecasting service.
                                   When set: written to public.rse_cache_versions.forecasting_service_version and to
                                   each entry JSONB payload under provenance.forecastingServiceVersion. When omitted:
                                   the column is NULL and provenance.forecastingServiceVersion is omitted from payloads.
                                   Does not change ECM, CO2, or SQL upsert behavior beyond those stored values.

Direct apply environment:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY

Examples:
  task rse-seed -- --help
  task rse-seed -- --cache-version 2026-05-12.all --forecasting-base-url http://localhost:8080 --dry-run
  task rse-seed -- --cache-version 2026-05-12.all --forecasting-base-url http://localhost:8080 --out .work/rse-seed.sql
  task rse-seed -- --cache-version 2026-05-12.it-demo --archetypes '[{"country":"IT","category":"Residential","name":"Detached 1980"}]' --forecasting-base-url http://localhost:8080
`,
    );
}

function parseLogLevel(value: string | undefined): RSESeedLogLevel {
  if (!value) {
    return "info";
  }

  if (RSE_SEED_LOG_LEVELS.includes(value as RSESeedLogLevel)) {
    return value as RSESeedLogLevel;
  }

  throw new Error(
    `Unsupported --log-level: ${value}. Expected one of ${RSE_SEED_LOG_LEVELS.join(", ")}`,
  );
}

export function parseLogFormat(value: string | undefined): RSESeedLogFormat {
  if (!value || value.trim() === "") {
    return "auto";
  }

  if (RSE_SEED_LOG_FORMATS.includes(value as RSESeedLogFormat)) {
    return value as RSESeedLogFormat;
  }

  throw new Error(
    `Unsupported --log-format: ${value}. Expected one of ${RSE_SEED_LOG_FORMATS.join(", ")}`,
  );
}

function resolveSeedLogFormat(
  format: RSESeedLogFormat,
  sink: (text: string) => void,
): RSESeedResolvedLogFormat {
  if (format === "json") {
    return "json";
  }

  if (format === "pretty") {
    return "pretty";
  }

  return sink === defaultSeedStderr && process.stderr.isTTY ? "pretty" : "json";
}

function createSinkWritable(sink: (text: string) => void): Writable {
  return new Writable({
    write(chunk, _encoding, callback): void {
      sink(typeof chunk === "string" ? chunk : chunk.toString());
      callback();
    },
  });
}

function createSeedLogger(params: {
  level: RSESeedLogLevel;
  sink: (text: string) => void;
  now: () => Date;
  format: RSESeedResolvedLogFormat;
}): RSESeedLogger {
  if (params.level === "silent") {
    return createSilentSeedLogger();
  }

  const serializers = {
    error: (value: unknown) =>
      value instanceof Error
        ? { name: value.name, message: value.message }
        : value,
  };

  if (params.format === "pretty") {
    const prettyStream = pinoPretty({
      colorize: process.stderr.isTTY,
      translateTime: "SYS:iso",
      ignore: "pid,hostname",
      messageKey: "message",
      destination: createSinkWritable(params.sink),
      sync: true,
    });

    const logger = pino(
      {
        base: null,
        level: params.level,
        messageKey: "message",
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({ level: label }),
        },
        serializers,
      },
      prettyStream,
    );

    return toSeedLogger(logger);
  }

  const logger = pino(
    {
      base: null,
      level: params.level,
      messageKey: "message",
      timestamp: () => `,"timestamp":"${params.now().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
      },
      serializers,
    },
    {
      write: (message: string) => params.sink(message),
    } satisfies DestinationStream,
  );

  return toSeedLogger(logger);
}

function toSeedLogger(logger: PinoLogger): RSESeedLogger {
  const wrap =
    (level: Exclude<RSESeedLogLevel, "silent">) =>
    (event: string, message: string, fields: RSESeedLogFields = {}) => {
      logger[level]({ event, ...fields }, message);
    };

  return {
    debug: wrap("debug"),
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error"),
    child: (fields) => toSeedLogger(logger.child(fields)),
  };
}

function childSeedLogger(
  logger: RSESeedLogger,
  fields: RSESeedLogFields,
): RSESeedLogger {
  if (logger.child) {
    return logger.child(fields);
  }

  const wrap =
    (level: Exclude<RSESeedLogLevel, "silent">) =>
    (event: string, message: string, extraFields: RSESeedLogFields = {}) => {
      logger[level](event, message, { ...fields, ...extraFields });
    };

  return {
    debug: wrap("debug"),
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error"),
    child: (childFields) =>
      childSeedLogger(logger, { ...fields, ...childFields }),
  };
}

function markErrorLogged(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    RSE_SEED_LOGGED_ERRORS.add(error);
  }
}

function wasErrorLogged(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    RSE_SEED_LOGGED_ERRORS.has(error)
  );
}

async function verifyForecastingApi(
  forecastingClient: RSEForecastingSeedClient,
  logger: RSESeedLogger,
): Promise<ArchetypeInfo[]> {
  const startedAt = Date.now();

  logger.info(
    "forecasting.health_check.start",
    "Checking Forecasting API availability",
  );

  try {
    const archetypes = await forecastingClient.listArchetypes();

    if (!Array.isArray(archetypes)) {
      throw new Error(
        "Forecasting archetype availability endpoint returned a non-array payload",
      );
    }

    logger.info(
      "forecasting.health_check.success",
      "Forecasting API is reachable",
      {
        endpoint: "/forecasting/building/available",
        archetypeCount: archetypes.length,
        elapsedMs: Date.now() - startedAt,
      },
    );

    return archetypes;
  } catch (error) {
    logger.error(
      "forecasting.health_check.failure",
      "Forecasting API health check failed",
      {
        endpoint: "/forecasting/building/available",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error : new Error(String(error)),
      },
    );

    throw new Error(
      `Forecasting API is not reachable or not returning archetypes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Build a real HTTP client that talks to the Forecasting service.
 *  Param keys are camelCase in TypeScript but snake_case in query strings. */
export function makeFetchForecastingClient(
  baseUrl: string,
  logger: RSESeedLogger = createSilentSeedLogger(),
): RSEForecastingSeedClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async listArchetypes(): Promise<ArchetypeInfo[]> {
      return jsonRequest(
        `${normalizedBaseUrl}/forecasting/building/available`,
        {
          method: "GET",
        },
        logger,
      );
    },

    async getArchetypeDetails(
      archetype: RSEArchetypeRef,
    ): Promise<{ bui: unknown; system: unknown }> {
      const searchParams = new URLSearchParams({
        archetype: "true",
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      });

      return jsonRequest(
        `${normalizedBaseUrl}/forecasting/building?${searchParams.toString()}`,
        {
          method: "POST",
        },
        logger,
      );
    },

    async simulateECM(
      params: ECMApplicationParams,
    ): Promise<ECMApplicationResponse> {
      const isCustom = "bui" in params;
      const searchParams = new URLSearchParams({
        archetype: isCustom ? "false" : "true",
        weather_source: params.weatherSource ?? "pvgis",
      });

      for (const [key, value] of Object.entries(params)) {
        if (
          value === undefined ||
          key === "weatherSource" ||
          key === "bui" ||
          key === "system"
        ) {
          continue;
        }
        searchParams.set(toSnakeCase(key), String(value));
      }

      const formData = new FormData();

      if (isCustom) {
        formData.append("bui_json", JSON.stringify(params.bui));
        if (params.system) {
          formData.append("system_json", JSON.stringify(params.system));
        }
      }

      return jsonRequest<ECMApplicationResponse>(
        `${normalizedBaseUrl}/forecasting/ecm_application?${searchParams.toString()}`,
        {
          method: "POST",
          body: formData,
        },
        logger,
      );
    },

    async calculateEmissions(
      input: RSEEmissionScenarioInput,
    ): Promise<RSEEmissionResult> {
      return jsonRequest(
        `${normalizedBaseUrl}/forecasting/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        logger,
      );
    },
  };
}

/** Thin wrapper around fetch that throws on non-2xx and casts the JSON body. */
async function jsonRequest<T>(
  url: string,
  init: RequestInit,
  logger: RSESeedLogger = createSilentSeedLogger(),
): Promise<T> {
  const method = init.method ?? "GET";
  const { endpoint, queryParams } = splitRequestUrl(url);
  const startedAt = Date.now();
  let response: Response;

  logger.debug("forecasting.http.request", "Forecasting HTTP request", {
    method,
    endpoint,
    queryParams,
  });

  try {
    response = await fetch(url, init);
  } catch (error) {
    logger.debug(
      "forecasting.http.failure",
      "Forecasting HTTP request failed",
      {
        method,
        endpoint,
        queryParams,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error : new Error(String(error)),
      },
    );

    throw new Error(
      `${method} ${endpoint} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    logger.debug(
      "forecasting.http.failure",
      "Forecasting HTTP request failed",
      {
        method,
        endpoint,
        queryParams,
        status: response.status,
        elapsedMs: Date.now() - startedAt,
      },
    );

    throw new Error(`${method} ${endpoint} failed with ${response.status}`);
  }

  logger.debug(
    "forecasting.http.success",
    "Forecasting HTTP request succeeded",
    {
      method,
      endpoint,
      queryParams,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    },
  );

  return response.json() as Promise<T>;
}

function splitRequestUrl(url: string): {
  endpoint: string;
  queryParams?: Record<string, string>;
} {
  try {
    const parsed = new URL(url);
    const queryParams: Record<string, string> = {};

    for (const [key, value] of parsed.searchParams.entries()) {
      queryParams[key] = value;
    }

    return {
      endpoint: parsed.pathname,
      queryParams:
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
    };
  } catch {
    return {
      endpoint: url.split("?")[0],
    };
  }
}

function sanitizeServiceUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

/** Convert camelCase param names to snake_case for the Forecasting query string. */
function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function renderDryRunSummary(params: {
  generated: RSEGeneratedSeed;
  archetypeCount: number;
  packageCount: number;
  publish: boolean;
}): string {
  return [
    "RSE seed dry run completed.",
    `Cache version: ${params.generated.version.cache_version}`,
    `Archetypes: ${params.archetypeCount}`,
    `Packages: ${params.packageCount}`,
    `Generated entries: ${params.generated.entries.length}`,
    `Status: ${params.generated.version.status}`,
    `Publish requested: ${params.publish ? "yes" : "no"}`,
    "Database writes: none",
    "File writes: none",
    "",
  ].join("\n");
}

export async function runRSESeedCli(
  argv: string[],
  deps: RSESeedCliDeps = {
    env: process.env,
    stdout: (text) => process.stdout.write(text),
    stderr: defaultSeedStderr,
    writeFile,
    applySeed,
    makeForecastingClient: makeFetchForecastingClient,
    now: () => new Date(),
  },
): Promise<void> {
  const options = parseCliOptions(argv, deps);

  if (!options) {
    return;
  }

  const stderrSink = deps.stderr ?? (() => undefined);
  const logFormat = parseLogFormat(
    options.logFormat ?? deps.env.RSE_SEED_LOG_FORMAT,
  );
  const logger = createSeedLogger({
    level: options.logLevel ?? parseLogLevel(deps.env.RSE_SEED_LOG_LEVEL),
    sink: stderrSink,
    now: deps.now,
    format: resolveSeedLogFormat(logFormat, stderrSink),
  });
  const cacheVersion = options.cacheVersion;
  const dryRun = options.dryRun;
  const out = options.out;

  try {
    if (dryRun && options.apply) {
      throw new Error("--dry-run cannot be combined with --apply");
    }

    if (dryRun && out) {
      throw new Error("--dry-run cannot be combined with --out");
    }

    const packageIds = options.packages;
    const forecastingBaseUrl =
      options.forecastingBaseUrl ?? deps.env.VITE_API_URL;

    if (!forecastingBaseUrl || forecastingBaseUrl.startsWith("/")) {
      throw new Error(
        "--forecasting-base-url or absolute VITE_API_URL is required for CLI generation",
      );
    }

    const publish = options.publish;
    const apply = options.apply;
    const supabaseUrl = deps.env.VITE_SUPABASE_URL ?? deps.env.SUPABASE_URL;

    logger.info("rse_seed.service_urls", "RSE seed service targets", {
      forecastingBaseUrl: sanitizeServiceUrl(forecastingBaseUrl),
      supabaseUrl: apply ? sanitizeServiceUrl(supabaseUrl) : null,
      supabaseApplyEnabled: apply,
    });

    logger.info("rse_seed.start", "Starting RSE cache seed generation", {
      cacheVersion,
      dryRun,
      publish,
      apply,
      hasOutFile: out !== undefined,
    });

    if (apply) {
      const serviceRoleKey =
        deps.env.SUPABASE_KEY ?? deps.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
          "SUPABASE_URL and SUPABASE_KEY are required for --apply",
        );
      }

      logger.info(
        "supabase.connectivity.start",
        "Checking Supabase connectivity",
      );
      await (deps.verifySupabase ?? verifySupabase)(
        supabaseUrl,
        serviceRoleKey,
      );
      logger.info("supabase.connectivity.success", "Supabase is reachable");
    }

    const forecastingClient = deps.makeForecastingClient(
      forecastingBaseUrl,
      logger,
    );
    const availableArchetypes = await verifyForecastingApi(
      forecastingClient,
      logger,
    );

    logger.info("archetypes.resolve.start", "Resolving seed archetypes", {
      explicitOverride: options.archetypes !== undefined,
    });

    const archetypes = await resolveSeedArchetypes(
      options.archetypes,
      forecastingClient,
      availableArchetypes,
      logger,
    );

    logger.info("archetypes.resolve.success", "Resolved seed archetypes", {
      archetypeCount: archetypes.length,
    });

    const targets = archetypes.flatMap((archetype) =>
      packageIds.map((packageId) => ({ archetype, packageId })),
    );

    logger.info("seed.generate.start", "Generating RSE cache seed", {
      archetypeCount: archetypes.length,
      packageCount: packageIds.length,
      targetCount: targets.length,
    });

    const generated = await generateRSECacheSeedSql(
      {
        cacheVersion,
        targets,
        generatedAt: deps.now().toISOString(),
        forecastingServiceVersion: options.forecastingServiceVersion,
        description: options.description,
        publish,
        logger,
      },
      forecastingClient,
    );

    logger.info("seed.generate.success", "Generated RSE cache seed", {
      entryCount: generated.entries.length,
      sqlBytes: generated.sql.length,
    });

    if (dryRun) {
      logger.info("seed.dry_run.success", "RSE seed dry run completed", {
        entryCount: generated.entries.length,
      });
      deps.stdout(
        renderDryRunSummary({
          generated,
          archetypeCount: archetypes.length,
          packageCount: packageIds.length,
          publish,
        }),
      );
      logger.info("rse_seed.success", "RSE cache seed command completed", {
        cacheVersion,
        entryCount: generated.entries.length,
      });
      return;
    }

    if (out) {
      logger.info("seed.sql.write.start", "Writing generated SQL to file", {
        out,
      });
      await deps.writeFile(out, generated.sql);
      logger.info("seed.sql.write.success", "Generated SQL file written", {
        out,
        sqlBytes: generated.sql.length,
      });
    } else {
      deps.stdout(generated.sql);
    }

    if (apply) {
      const serviceRoleKey =
        deps.env.SUPABASE_KEY ?? deps.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
          "SUPABASE_URL and SUPABASE_KEY are required for --apply",
        );
      }

      logger.info("seed.apply.start", "Applying RSE cache seed to Supabase", {
        entryCount: generated.entries.length,
        publish,
      });
      await deps.applySeed(generated, supabaseUrl, serviceRoleKey);
      logger.info("seed.apply.success", "Applied RSE cache seed to Supabase", {
        entryCount: generated.entries.length,
      });
    }

    logger.info("rse_seed.success", "RSE cache seed command completed", {
      cacheVersion,
      entryCount: generated.entries.length,
    });
  } catch (error) {
    logger.error("rse_seed.failure", "RSE cache seed command failed", {
      cacheVersion,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    markErrorLogged(error);
    throw error;
  }
}

/** CLI entry point.  Parses flags, calls the generator, writes SQL to stdout or
 *  a file, and optionally applies the seed directly to Supabase with --apply. */
async function main(): Promise<void> {
  await runRSESeedCli(process.argv.slice(2));
}

/** Run main only when this module is executed directly (not imported for tests). */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    if (!wasErrorLogged(error)) {
      createSeedLogger({
        level: "info",
        sink: defaultSeedStderr,
        now: () => new Date(),
        format: resolveSeedLogFormat("auto", defaultSeedStderr),
      }).error("rse_seed.failure", "RSE cache seed command failed", {
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    process.exitCode = 1;
  });
}
