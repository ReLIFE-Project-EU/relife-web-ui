import { describe, expect, test, vi } from "vitest";

import {
  generateRSECacheSeedSql,
  makeFetchForecastingClient as makeRealForecastingClientForTest,
  resolveSeedArchetypes,
  runRSESeedCli,
  type RSEGeneratedSeed,
  type RSEForecastingSeedClient,
} from "../../../../scripts/rse-cache/generate.ts";
import type { RSEEmissionScenarioInput } from "../../../../src/features/strategy-explorer/types";
import type { ECMApplicationParams } from "../../../../src/types/forecasting";

type RSESeedLogEvent = {
  event: string;
  level: string;
  [key: string]: unknown;
};

describe("generateRSECacheSeedSql", () => {
  test("emits idempotent SQL for a one-row RSE cache seed", async () => {
    const { client, simulateCalls } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const result = await generateRSECacheSeedSql(
      {
        cacheVersion: "1.test.abc1234",
        generatedAt: "2026-05-12T10:04:00.000Z",
        forecastingServiceVersion: "forecasting-test",
        description: "S3 fixture's seed",
        targets: [
          {
            archetype: {
              country: "IT",
              category: "Residential",
              name: "Detached '1980'",
              floorArea: 100,
            },
            packageId: "envelope",
          },
        ],
      },
      client,
    );

    expect(result.entries).toHaveLength(1);
    expect(simulateCalls[0]).toEqual(
      expect.objectContaining({ include_baseline: true }),
    );
    expect(result.entries[0].payload.baseline.displayEpcClass).toBe("C");
    expect(result.sql).toContain("INSERT INTO public.rse_cache_versions");
    expect(result.sql).toContain(
      "ON CONFLICT (cache_version) DO UPDATE SET status = EXCLUDED.status",
    );
    expect(result.sql).toContain(
      "ON CONFLICT (cache_version, archetype_country, archetype_category, archetype_name, package_id) DO UPDATE",
    );
    expect(result.sql).toContain("'1.test.abc1234'");
    expect(result.sql).toContain("'S3 fixture''s seed'");
    expect(result.sql).toContain("'Detached ''1980'''");
    expect(result.sql).toContain('"absoluteTonCo2eq":0.8');
    expect(result.sql).toContain("::jsonb");
  });

  test("throws when Forecasting omits the requested baseline scenario", async () => {
    const { client } = makeForecastingClient({
      scenarios: [makeScenario("wall", 8_000, { thermalKwh: 8_000 })],
    });

    await expect(
      generateRSECacheSeedSql(
        {
          cacheVersion: "1.test.abc1234",
          generatedAt: "2026-05-12T10:04:00.000Z",
          targets: [
            {
              archetype: {
                country: "IT",
                category: "Residential",
                name: "Detached 1980",
                floorArea: 100,
              },
              packageId: "envelope",
            },
          ],
        },
        client,
      ),
    ).rejects.toThrow("baseline scenario");
  });

  test("aggregates mixed CO2 carrier components before comparing savings", async () => {
    const { client, calculateInputs } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 1_500, {
          thermalKwh: 1_000,
          electricTotalKwh: 500,
        }),
        makeScenario("combined", 900, {
          thermalKwh: 500,
          electricTotalKwh: 400,
          pvGridImportKwh: 250,
          pvSelfConsumptionKwh: 100,
        }),
      ],
    });

    const result = await generateRSECacheSeedSql(
      {
        cacheVersion: "1.test.mixed",
        generatedAt: "2026-05-12T10:04:00.000Z",
        targets: [
          {
            archetype: {
              country: "IT",
              category: "Residential",
              name: "Detached 1980",
              floorArea: 100,
            },
            packageId: "combined",
          },
        ],
      },
      client,
    );

    expect(calculateInputs.map((input) => input.name)).toEqual([
      "baseline:thermal",
      "baseline:grid-electricity",
      "renovated:thermal",
      "renovated:grid-electricity",
      "renovated:pv-self-consumption",
    ]);
    expect(calculateInputs[3]).toEqual(
      expect.objectContaining({
        energy_source: "grid_electricity",
        annual_consumption_kwh: 300,
      }),
    );
    expect(result.entries[0].payload.baseline.co2).toEqual(
      expect.objectContaining({
        annualConsumptionKwh: 1_500,
        annualEmissionsKgCo2eq: 400,
        annualEmissionsTonCo2eq: 0.4,
        weightedEmissionFactorKgPerKwh: 0.2667,
      }),
    );
    expect(result.entries[0].payload.renovated.co2).toEqual(
      expect.objectContaining({
        annualConsumptionKwh: 900,
        annualEmissionsKgCo2eq: 220,
        annualEmissionsTonCo2eq: 0.22,
        weightedEmissionFactorKgPerKwh: 0.2444,
      }),
    );
    expect(result.entries[0].payload.co2Comparison.savings).toEqual({
      absoluteKgCo2eq: 180,
      absoluteTonCo2eq: 0.18,
      percentage: 45,
    });
  });
});

describe("resolveSeedArchetypes", () => {
  test("discovers Forecasting archetypes and extracts floor areas by default", async () => {
    const { client, listCalls, detailCalls } = makeForecastingClient({
      archetypes: [
        { country: "IT", category: "Residential", name: "Detached 1980" },
        { country: "GR", category: "Residential", name: "Apartment 2000" },
      ],
      detailsByName: {
        "Detached 1980": makeArchetypeDetails(100),
        "Apartment 2000": makeArchetypeDetails(85),
      },
    });

    await expect(resolveSeedArchetypes(undefined, client)).resolves.toEqual([
      {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
        floorArea: 100,
      },
      {
        country: "GR",
        category: "Residential",
        name: "Apartment 2000",
        floorArea: 85,
      },
    ]);
    expect(listCalls).toHaveLength(1);
    expect(detailCalls.map((item) => item.name)).toEqual([
      "Detached 1980",
      "Apartment 2000",
    ]);
  });

  test("uses explicit archetype JSON but still fetches floor areas", async () => {
    const { client, listCalls, detailCalls } = makeForecastingClient({
      detailsByName: {
        "Detached 1980": makeArchetypeDetails(100),
      },
    });

    await expect(
      resolveSeedArchetypes(
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        client,
      ),
    ).resolves.toEqual([
      {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
        floorArea: 100,
      },
    ]);
    expect(listCalls).toEqual([]);
    expect(detailCalls.map((item) => item.name)).toEqual(["Detached 1980"]);
  });

  test("rejects explicit archetype JSON with non-identifier fields", async () => {
    const { client, listCalls, detailCalls } = makeForecastingClient();

    await expect(
      resolveSeedArchetypes(
        '[{"country":"IT","category":"Residential","name":"Detached 1980","floorArea":100}]',
        client,
      ),
    ).rejects.toThrow(
      "--archetypes entries must include only country, category, and name",
    );
    expect(listCalls).toEqual([]);
    expect(detailCalls).toEqual([]);
  });

  test("rejects discovered archetypes without a positive floor area", async () => {
    const { client } = makeForecastingClient({
      archetypes: [
        { country: "IT", category: "Residential", name: "Detached 1980" },
      ],
      detailsByName: {
        "Detached 1980": makeArchetypeDetails(0),
      },
    });

    await expect(resolveSeedArchetypes(undefined, client)).rejects.toThrow(
      "bui.building.net_floor_area",
    );
  });
});

describe("runRSESeedCli", () => {
  test("dry-run validates generation and skips file and database writes", async () => {
    const { client, listCalls } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const output: string[] = [];
    const writes: string[] = [];
    const applied: RSEGeneratedSeed[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.dry",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://forecasting.test",
        "--packages",
        "envelope",
        "--dry-run",
      ],
      {
        env: {},
        stdout: (text) => output.push(text),
        writeFile: async (path) => {
          writes.push(path);
        },
        applySeed: async (generated) => {
          applied.push(generated);
        },
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    expect(output.join("")).toContain("RSE seed dry run completed.");
    expect(output.join("")).toContain("Generated entries: 1");
    expect(output.join("")).toContain("Database writes: none");
    expect(output.join("")).not.toContain(
      "INSERT INTO public.rse_cache_versions",
    );
    expect(listCalls).toEqual(["list"]);
    expect(writes).toEqual([]);
    expect(applied).toEqual([]);
  });

  test("checks Forecasting availability before dry-run side effects", async () => {
    const { client, listCalls, simulateCalls } = makeForecastingClient();
    const output: string[] = [];
    const writes: string[] = [];
    const applied: RSEGeneratedSeed[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.empty",
        "--archetypes",
        "[]",
        "--forecasting-base-url",
        "http://forecasting.test",
        "--dry-run",
      ],
      {
        env: {},
        stdout: (text) => output.push(text),
        writeFile: async (path) => {
          writes.push(path);
        },
        applySeed: async (generated) => {
          applied.push(generated);
        },
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    expect(listCalls).toEqual(["list"]);
    expect(simulateCalls).toEqual([]);
    expect(output.join("")).toContain("Generated entries: 0");
    expect(writes).toEqual([]);
    expect(applied).toEqual([]);
  });

  test("fails fast when Forecasting availability cannot be checked", async () => {
    const { client, listCalls, simulateCalls } = makeForecastingClient({
      listError: new Error("connection refused"),
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const output: string[] = [];
    const writes: string[] = [];
    const applied: RSEGeneratedSeed[] = [];

    await expect(
      runRSESeedCli(
        [
          "--cache-version",
          "1.test.down",
          "--archetypes",
          '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
          "--forecasting-base-url",
          "http://forecasting.test",
          "--dry-run",
        ],
        {
          env: {},
          stdout: (text) => output.push(text),
          writeFile: async (path) => {
            writes.push(path);
          },
          applySeed: async (generated) => {
            applied.push(generated);
          },
          makeForecastingClient: () => client,
          now: () => new Date("2026-05-12T10:04:00.000Z"),
        },
      ),
    ).rejects.toThrow("Forecasting API is not reachable");

    expect(listCalls).toEqual(["list"]);
    expect(simulateCalls).toEqual([]);
    expect(output).toEqual([]);
    expect(writes).toEqual([]);
    expect(applied).toEqual([]);
  });

  test("emits structured logs to stderr without contaminating stdout", async () => {
    const { client } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const output: string[] = [];
    const errors: string[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.logs",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://forecasting.test",
        "--packages",
        "envelope",
        "--dry-run",
      ],
      {
        env: {},
        stdout: (text) => output.push(text),
        stderr: (text) => errors.push(text),
        writeFile: async () => undefined,
        applySeed: async () => undefined,
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    const logEvents = errors
      .join("")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string; level: string });

    expect(output.join("")).toContain("RSE seed dry run completed.");
    expect(output.join("")).not.toContain('"event"');
    expect(logEvents[0]).toEqual(
      expect.objectContaining({
        event: "rse_seed.service_urls",
        level: "info",
      }),
    );
    expect(logEvents.map((log) => log.event)).toEqual(
      expect.arrayContaining([
        "rse_seed.service_urls",
        "rse_seed.start",
        "forecasting.health_check.success",
        "seed.generate.success",
        "seed.dry_run.success",
        "rse_seed.success",
      ]),
    );
    expect(logEvents.every((log) => log.level === "info")).toBe(true);
  });

  test("summarizes service URLs before applying directly", async () => {
    const { client } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const errors: string[] = [];
    const applied: RSEGeneratedSeed[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.apply",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://user:pass@forecasting.test/api?token=secret",
        "--packages",
        "envelope",
        "--apply",
      ],
      {
        env: {
          SUPABASE_URL: "https://example.supabase.co?apikey=secret",
          SUPABASE_KEY: "service-role-key",
        },
        stdout: () => undefined,
        stderr: (text) => errors.push(text),
        writeFile: async () => undefined,
        applySeed: async (generated) => {
          applied.push(generated);
        },
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    const [serviceSummary] = errors
      .join("")
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            event: string;
            forecastingBaseUrl: string;
            supabaseUrl: string;
            supabaseApplyEnabled: boolean;
          },
      );

    expect(serviceSummary).toEqual(
      expect.objectContaining({
        event: "rse_seed.service_urls",
        forecastingBaseUrl: "http://forecasting.test/api",
        supabaseUrl: "https://example.supabase.co",
        supabaseApplyEnabled: true,
      }),
    );
    expect(applied).toHaveLength(1);
  });

  test("emits useful debug events for a one-target dry run", async () => {
    const { client } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const errors: string[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.debug",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://forecasting.test",
        "--packages",
        "envelope",
        "--dry-run",
        "--log-level",
        "debug",
      ],
      {
        env: {},
        stdout: () => undefined,
        stderr: (text) => errors.push(text),
        writeFile: async () => undefined,
        applySeed: async () => undefined,
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    const logEvents = parseJsonLines(errors);

    expect(logEvents[0]).toEqual(
      expect.objectContaining({ event: "rse_seed.service_urls" }),
    );
    expect(logEvents.map((log) => log.event)).toEqual(
      expect.arrayContaining([
        "archetypes.override.summary",
        "seed.target.start",
        "forecasting.ecm.request_summary",
        "forecasting.ecm.response_summary",
        "co2.inputs.summary",
        "co2.calculate.start",
        "co2.calculate.success",
        "co2.results.summary",
        "seed.payload.validation_success",
        "seed.generate.progress",
        "seed.target.success",
      ]),
    );
    expect(logEvents.some((log) => log.level === "debug")).toBe(true);
    expect(
      logEvents.find((log) => log.event === "co2.results.summary"),
    ).toEqual(
      expect.objectContaining({
        baselineAnnualEmissionsKgCo2eq: 2_400,
        renovatedAnnualEmissionsKgCo2eq: 1_600,
        savingsKgCo2eq: 800,
      }),
    );
  });

  test("does not emit debug events at info level", async () => {
    const { client } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const errors: string[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.info",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://forecasting.test",
        "--packages",
        "envelope",
        "--dry-run",
      ],
      {
        env: {},
        stdout: () => undefined,
        stderr: (text) => errors.push(text),
        writeFile: async () => undefined,
        applySeed: async () => undefined,
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    expect(parseJsonLines(errors).some((log) => log.level === "debug")).toBe(
      false,
    );
  });

  test("debug HTTP logs use sanitized endpoints and query params", async () => {
    const errors: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));

        if (url.pathname === "/api/forecasting/building/available") {
          return jsonResponse([]);
        }

        if (url.pathname === "/api/forecasting/building") {
          return jsonResponse(makeArchetypeDetails(100));
        }

        if (url.pathname === "/api/forecasting/ecm_application") {
          return jsonResponse({
            source: "archetype",
            name: "Detached 1980",
            category: "Residential",
            country: "IT",
            weather_source: "pvgis",
            u_values_requested: {
              roof: null,
              wall: 0.25,
              window: null,
              slab: null,
            },
            single_scenario_mode: {
              baseline_only: false,
              scenario_id: null,
              scenario_elements: "wall",
            },
            n_scenarios: 2,
            scenarios: [
              makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
              makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
            ],
          });
        }

        if (url.pathname === "/api/forecasting/calculate") {
          const input = JSON.parse(
            String(init?.body),
          ) as RSEEmissionScenarioInput;

          return jsonResponse(
            makeEmissionResult(
              input.name,
              input.energy_source,
              input.annual_consumption_kwh,
              input.annual_consumption_kwh * 0.2,
            ),
          );
        }

        return jsonResponse({ detail: "not found" }, 404);
      }),
    );

    try {
      await runRSESeedCli(
        [
          "--cache-version",
          "1.test.http",
          "--archetypes",
          '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
          "--forecasting-base-url",
          "http://user:pass@forecasting.test/api",
          "--packages",
          "envelope",
          "--dry-run",
          "--log-level",
          "debug",
        ],
        {
          env: {},
          stdout: () => undefined,
          stderr: (text) => errors.push(text),
          writeFile: async () => undefined,
          applySeed: async () => undefined,
          makeForecastingClient: (baseUrl, logger) =>
            makeRealForecastingClientForTest(baseUrl, logger),
          now: () => new Date("2026-05-12T10:04:00.000Z"),
        },
      );
    } finally {
      vi.unstubAllGlobals();
    }

    const httpRequest = parseJsonLines(errors).find(
      (log) =>
        log.event === "forecasting.http.request" &&
        log.endpoint === "/api/forecasting/ecm_application",
    );

    expect(httpRequest).toEqual(
      expect.objectContaining({
        method: "POST",
        endpoint: "/api/forecasting/ecm_application",
        queryParams: expect.objectContaining({
          archetype: "true",
          country: "IT",
          category: "Residential",
          name: "Detached 1980",
        }),
      }),
    );
    expect(JSON.stringify(httpRequest)).not.toContain("user:pass");
  });

  test("suppresses structured logs when log level is silent", async () => {
    const { client } = makeForecastingClient({
      scenarios: [
        makeScenario("baseline", 12_000, { thermalKwh: 12_000 }),
        makeScenario("wall", 8_000, { thermalKwh: 8_000 }),
      ],
    });
    const errors: string[] = [];

    await runRSESeedCli(
      [
        "--cache-version",
        "1.test.silent",
        "--archetypes",
        '[{"country":"IT","category":"Residential","name":"Detached 1980"}]',
        "--forecasting-base-url",
        "http://forecasting.test",
        "--packages",
        "envelope",
        "--dry-run",
        "--log-level",
        "silent",
      ],
      {
        env: {},
        stdout: () => undefined,
        stderr: (text) => errors.push(text),
        writeFile: async () => undefined,
        applySeed: async () => undefined,
        makeForecastingClient: () => client,
        now: () => new Date("2026-05-12T10:04:00.000Z"),
      },
    );

    expect(errors).toEqual([]);
  });

  test("rejects dry-run combinations that would create side effects", async () => {
    const { client } = makeForecastingClient();
    const deps = {
      env: {},
      stdout: () => undefined,
      writeFile: async () => undefined,
      applySeed: async () => undefined,
      makeForecastingClient: () => client,
      now: () => new Date("2026-05-12T10:04:00.000Z"),
    };

    await expect(
      runRSESeedCli(
        [
          "--cache-version",
          "1.test",
          "--archetypes",
          "[]",
          "--forecasting-base-url",
          "http://forecasting.test",
          "--dry-run",
          "--out",
          ".work/rse.sql",
        ],
        deps,
      ),
    ).rejects.toThrow("--dry-run cannot be combined with --out");

    await expect(
      runRSESeedCli(
        [
          "--cache-version",
          "1.test",
          "--archetypes",
          "[]",
          "--forecasting-base-url",
          "http://forecasting.test",
          "--dry-run",
          "--apply",
        ],
        deps,
      ),
    ).rejects.toThrow("--dry-run cannot be combined with --apply");
  });
});

function makeForecastingClient(response?: {
  archetypes?: Array<{ country: string; category: string; name: string }>;
  detailsByName?: Record<string, { bui: unknown; system: unknown }>;
  scenarios?: ReturnType<typeof makeScenario>[];
  listError?: Error;
}): {
  client: RSEForecastingSeedClient;
  listCalls: string[];
  detailCalls: Array<{ country: string; category: string; name: string }>;
  simulateCalls: ECMApplicationParams[];
  calculateInputs: RSEEmissionScenarioInput[];
} {
  const listCalls: string[] = [];
  const detailCalls: Array<{
    country: string;
    category: string;
    name: string;
  }> = [];
  const simulateCalls: ECMApplicationParams[] = [];
  const calculateInputs: RSEEmissionScenarioInput[] = [];
  const emissionFactors: Record<string, number> = {
    natural_gas: 0.2,
    grid_electricity: 0.4,
    solar_pv: 0,
  };

  return {
    listCalls,
    detailCalls,
    simulateCalls,
    calculateInputs,
    client: {
      async listArchetypes() {
        listCalls.push("list");
        if (response?.listError) {
          throw response.listError;
        }

        return response?.archetypes ?? [];
      },
      async getArchetypeDetails(archetype) {
        detailCalls.push(archetype);
        return (
          response?.detailsByName?.[archetype.name] ?? makeArchetypeDetails(100)
        );
      },
      async simulateECM(params) {
        simulateCalls.push(params);

        return {
          source: "archetype",
          name: "Detached 1980",
          category: "Residential",
          country: "IT",
          weather_source: "pvgis",
          u_values_requested: {
            roof: null,
            wall: 0.25,
            window: null,
            slab: null,
          },
          single_scenario_mode: {
            baseline_only: false,
            scenario_id: null,
            scenario_elements: "wall",
          },
          n_scenarios: response?.scenarios?.length ?? 0,
          scenarios: response?.scenarios ?? [],
        };
      },
      async calculateEmissions(input) {
        calculateInputs.push(input);
        const factor = emissionFactors[input.energy_source] ?? 0;
        const annualEmissionsKgCo2eq = input.annual_consumption_kwh * factor;

        return makeEmissionResult(
          input.name,
          input.energy_source,
          input.annual_consumption_kwh,
          annualEmissionsKgCo2eq,
        );
      },
    },
  };
}

function parseJsonLines(chunks: string[]): RSESeedLogEvent[] {
  const text = chunks.join("").trim();

  if (!text) {
    return [];
  }

  return text.split("\n").map((line) => JSON.parse(line) as RSESeedLogEvent);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeArchetypeDetails(floorArea: number): {
  bui: unknown;
  system: unknown;
} {
  return {
    bui: {
      building: {
        net_floor_area: floorArea,
      },
    },
    system: {},
  };
}

function makeScenario(
  scenarioId: string,
  annualEnergyKwh: number,
  energy: {
    thermalKwh: number;
    electricTotalKwh?: number;
    pvGridImportKwh?: number;
    pvSelfConsumptionKwh?: number;
  },
) {
  const pvHp =
    energy.pvGridImportKwh === undefined &&
    energy.pvSelfConsumptionKwh === undefined
      ? undefined
      : {
          summary: {
            annual_kwh: {
              grid_import: energy.pvGridImportKwh,
              self_consumption: energy.pvSelfConsumptionKwh,
            },
          },
        };

  return {
    scenario_id: scenarioId,
    description: scenarioId,
    elements: ["wall" as const],
    u_values: {
      roof: null,
      wall: scenarioId === "baseline" ? null : 0.25,
      window: null,
      slab: null,
    },
    results: {
      hourly_building: {},
      annual_building: [],
      primary_energy_uni11300: {
        summary: {
          EP_total_kWh: annualEnergyKwh,
          E_delivered_thermal_kWh: energy.thermalKwh,
          E_delivered_electric_total_kWh: energy.electricTotalKwh ?? 0,
        },
      },
      pv_hp: pvHp,
    },
  };
}

function makeEmissionResult(
  name: string,
  energySource: string,
  annualConsumptionKwh: number,
  annualEmissionsKgCo2eq: number,
) {
  return {
    name,
    energy_source: energySource,
    annual_consumption_kwh: annualConsumptionKwh,
    emission_factor_kg_per_kwh: annualEmissionsKgCo2eq / annualConsumptionKwh,
    annual_emissions_kg_co2eq: annualEmissionsKgCo2eq,
    annual_emissions_ton_co2eq: annualEmissionsKgCo2eq / 1_000,
    equivalent_trees: annualEmissionsKgCo2eq / 20,
    equivalent_km_car: annualEmissionsKgCo2eq * 5,
  };
}
