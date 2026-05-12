import { describe, expect, test } from "vitest";

import {
  createRSECacheApi,
  RSECacheApiError,
} from "../../../../../src/features/strategy-explorer/api/rseCacheApi";
import type { RSEArchetypeRef } from "../../../../../src/features/strategy-explorer/types";

type FakeRow = Record<string, unknown>;
type FakeResponse = { data: FakeRow[]; error: Error | null };

const archetype: RSEArchetypeRef = {
  country: "IT",
  category: "Residential",
  name: "Detached 1980",
};

const cacheVersionRow = {
  cache_version: "1.test.abc1234",
  status: "published",
  created_at: "2026-05-12T09:00:00.000Z",
  published_at: "2026-05-12T10:00:00.000Z",
  co2_method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
};

const cacheEntryRow = {
  cache_version: "1.test.abc1234",
  archetype_country: archetype.country,
  archetype_category: archetype.category,
  archetype_name: archetype.name,
  package_id: "envelope",
  payload_schema_version: 1,
  created_at: "2026-05-12T10:05:00.000Z",
  payload: {
    baseline: {
      annualEnergyKwh: 12_000,
      displayEpcClass: "D",
      primaryEnergyUni11300Summary: {},
      co2Inputs: [],
      co2: {
        annualConsumptionKwh: 12_000,
        annualEmissionsKgCo2eq: 2_400,
        annualEmissionsTonCo2eq: 2.4,
        weightedEmissionFactorKgPerKwh: 0.2,
        equivalentTrees: 120,
        equivalentKmCar: 12_000,
        sourceBreakdownKwh: {
          naturalGas: 12_000,
          gridElectricity: 0,
          solarPv: 0,
        },
        thermalEmissionSource: "natural_gas",
      },
    },
    renovated: {
      annualEnergyKwh: 8_000,
      displayEpcClass: "C",
      primaryEnergyUni11300Summary: {},
      co2Inputs: [],
      co2: {
        annualConsumptionKwh: 8_000,
        annualEmissionsKgCo2eq: 1_600,
        annualEmissionsTonCo2eq: 1.6,
        weightedEmissionFactorKgPerKwh: 0.2,
        equivalentTrees: 80,
        equivalentKmCar: 8_000,
        sourceBreakdownKwh: {
          naturalGas: 8_000,
          gridElectricity: 0,
          solarPv: 0,
        },
        thermalEmissionSource: "natural_gas",
      },
    },
    co2Comparison: {
      baselineAnnualEmissionsKgCo2eq: 2_400,
      renovatedAnnualEmissionsKgCo2eq: 1_600,
      savings: {
        absoluteKgCo2eq: 800,
        absoluteTonCo2eq: 0.8,
        percentage: 33.3333,
      },
    },
    provenance: {
      source: "manual-seed",
      co2ComputedAt: "2026-05-12T10:04:00.000Z",
      co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
      emissionFactorCountry: "IT",
    },
  },
};

describe("rseCacheApi", () => {
  test("loads the published cache version", async () => {
    const api = createRSECacheApi(
      fakeClient({
        rse_cache_versions: [cacheVersionRow],
      }),
    );

    await expect(api.getPublishedVersion()).resolves.toEqual({
      cacheVersion: "1.test.abc1234",
      generatedAt: "2026-05-12T10:00:00.000Z",
      co2Method: "forecasting-carrier-split-final-energy-gas-thermal-mvp",
    });
  });

  test("maps cache rows and filters over-fetched archetype combinations", async () => {
    const api = createRSECacheApi(
      fakeClient({
        rse_cache_versions: [cacheVersionRow],
        rse_forecasting_cache_entries: [
          cacheEntryRow,
          {
            ...cacheEntryRow,
            archetype_name: "Apartment 2000",
          },
        ],
      }),
    );

    const entries = await api.listEntries({
      archetypes: [archetype],
      packageIds: ["envelope"],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].key).toEqual({
      cacheVersion: "1.test.abc1234",
      archetype,
      packageId: "envelope",
    });
    expect(entries[0].co2Comparison.savings.absoluteTonCo2eq).toBe(0.8);
  });

  test("reports missing archetype/package combinations", async () => {
    const api = createRSECacheApi(
      fakeClient({
        rse_cache_versions: [cacheVersionRow],
        rse_forecasting_cache_entries: [cacheEntryRow],
      }),
    );

    const availability = await api.getAvailability({
      archetypes: [archetype],
      packageIds: ["envelope", "combined"],
    });

    expect(availability.available).toHaveLength(1);
    expect(availability.missing).toEqual([
      {
        archetype,
        packageId: "combined",
        reason: "missing-cache-entry",
      },
    ]);
  });

  test("throws a feature-local error when no published cache exists", async () => {
    const api = createRSECacheApi(fakeClient({ rse_cache_versions: [] }));

    await expect(api.getPublishedVersion()).rejects.toMatchObject({
      name: "RSECacheApiError",
      code: "not-found",
    } satisfies Partial<RSECacheApiError>);
  });
});

function fakeClient(
  tables: Record<string, FakeRow[]>,
): Parameters<typeof createRSECacheApi>[0] {
  return {
    from(table: string) {
      return new FakeQuery(tables[table] ?? []);
    },
  } as unknown as Parameters<typeof createRSECacheApi>[0];
}

class FakeQuery implements PromiseLike<FakeResponse> {
  private filters: Array<(row: FakeRow) => boolean> = [];
  private rowLimit: number | undefined;
  private readonly rows: FakeRow[];

  constructor(rows: FakeRow[]) {
    this.rows = rows;
  }

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(): this {
    return this;
  }

  limit(count: number): this {
    this.rowLimit = count;
    return this;
  }

  async maybeSingle(): Promise<{ data: FakeRow | null; error: Error | null }> {
    const rows = this.applyFilters();
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  then<TResult1 = FakeResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: FakeResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.applyFilters(),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  private applyFilters(): FakeRow[] {
    const rows = this.rows.filter((row) =>
      this.filters.every((filter) => filter(row)),
    );

    return typeof this.rowLimit === "number"
      ? rows.slice(0, this.rowLimit)
      : rows;
  }
}
