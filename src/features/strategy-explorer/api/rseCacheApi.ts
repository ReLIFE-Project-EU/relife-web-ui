import { supabase } from "../../../auth";
import { RSE_CACHE_PAYLOAD_SCHEMA_VERSION } from "../constants";
import type {
  RSEArchetypeRef,
  RSECo2Method,
  RSEForecastingCacheEntry,
  RSEForecastingCacheKey,
  RSEPackageId,
} from "../types";

/** Feature-local error codes so callers can distinguish
 *  database failures, missing data, and malformed payloads. */
export type RSECacheApiErrorCode = "database" | "not-found" | "validation";

/** Wraps Supabase or payload-validation errors in a typed exception
 *  so the UI can show appropriate messages without parsing raw PostgREST text. */
export class RSECacheApiError extends Error {
  readonly code: RSECacheApiErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: RSECacheApiErrorCode,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "RSECacheApiError";
    this.code = code;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, RSECacheApiError.prototype);
  }
}

/** The currently published cache generation that the wizard should use. */
export interface RSEPublishedCacheVersion {
  cacheVersion: string;
  generatedAt: string;
  co2Method: RSECo2Method;
}

/** Request to fetch a matrix of cache entries.
 *  If cacheVersion is omitted, the latest published version is resolved automatically. */
export interface RSECacheMatrixRequest {
  archetypes: RSEArchetypeRef[];
  packageIds: RSEPackageId[];
  cacheVersion?: string;
}

/** Result of an availability check: which (archetype, package) tuples are present
 *  in the cache and which are missing (so the wizard can block or warn). */
export interface RSECacheAvailability {
  available: RSEForecastingCacheKey[];
  missing: Array<{
    archetype: RSEArchetypeRef;
    packageId: RSEPackageId;
    reason: string;
  }>;
}

interface RSECacheVersionRow {
  cache_version: string;
  created_at: string;
  published_at: string | null;
  co2_method: RSECo2Method;
}

interface RSEForecastingCacheEntryRow {
  cache_version: string;
  archetype_country: string;
  archetype_category: string;
  archetype_name: string;
  package_id: RSEPackageId;
  payload_schema_version: number;
  payload: unknown;
  created_at: string;
}

interface RSEForecastingCachePayload {
  baseline: RSEForecastingCacheEntry["baseline"];
  renovated: RSEForecastingCacheEntry["renovated"];
  co2Comparison: RSEForecastingCacheEntry["co2Comparison"];
  provenance: RSEForecastingCacheEntry["provenance"];
}

const MISSING_CACHE_ENTRY_REASON = "missing-cache-entry";

/** Default instance backed by the global Supabase client.
 *  Use createRSECacheApi directly in tests with a fake client. */
export const rseCacheApi = createRSECacheApi(supabase);

/** Factory so tests can inject a fake Supabase client without mocking modules.
 *  Only SELECT queries are exposed; writes live in scripts/rse-cache/generate.ts. */
export function createRSECacheApi(client: Pick<typeof supabase, "from">) {
  return {
    /** Resolve the single most-recently-published cache version.
     *  Throws not-found when no version has been published yet. */
    async getPublishedVersion(): Promise<RSEPublishedCacheVersion> {
      const { data, error } = await client
        .from("rse_cache_versions")
        .select("cache_version, created_at, published_at, co2_method")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new RSECacheApiError(
          "Failed to load the published RSE cache version.",
          "database",
          { cause: error },
        );
      }

      if (!data) {
        throw new RSECacheApiError(
          "No published RSE cache version is available.",
          "not-found",
        );
      }

      return toPublishedVersion(data as RSECacheVersionRow);
    },

    /** Fetch all cache entries that match the requested archetype × package matrix.
     *  Supabase .in() clauses are broader than the exact matrix, so the result is
     *  filtered client-side to discard rows for archetype/package combinations
     *  that were not explicitly requested. */
    async listEntries(
      request: RSECacheMatrixRequest,
    ): Promise<RSEForecastingCacheEntry[]> {
      if (request.archetypes.length === 0 || request.packageIds.length === 0) {
        return [];
      }

      const cacheVersion =
        request.cacheVersion ?? (await this.getPublishedVersion()).cacheVersion;

      const { data, error } = await client
        .from("rse_forecasting_cache_entries")
        .select(
          [
            "cache_version",
            "archetype_country",
            "archetype_category",
            "archetype_name",
            "package_id",
            "payload_schema_version",
            "payload",
            "created_at",
          ].join(", "),
        )
        .eq("cache_version", cacheVersion)
        .in("package_id", [...new Set(request.packageIds)])
        .in("archetype_country", uniqueValues(request.archetypes, "country"))
        .in("archetype_category", uniqueValues(request.archetypes, "category"))
        .in("archetype_name", uniqueValues(request.archetypes, "name"));

      if (error) {
        throw new RSECacheApiError(
          "Failed to load RSE cache entries.",
          "database",
          { cause: error },
        );
      }

      const expectedKeys = new Set(
        buildExpectedKeys(request.archetypes, request.packageIds, cacheVersion),
      );

      return ((data ?? []) as unknown as RSEForecastingCacheEntryRow[])
        .filter((row) => expectedKeys.has(rowKey(row)))
        .map(toCacheEntry);
    },

    /** Compare the requested matrix against what is actually stored in the cache
     *  so the caller can report missing (archetype, package) combinations
     *  before running aggregation or financial calculations. */
    async getAvailability(
      request: RSECacheMatrixRequest,
    ): Promise<RSECacheAvailability> {
      const cacheVersion =
        request.cacheVersion ?? (await this.getPublishedVersion()).cacheVersion;
      const entries = await this.listEntries({ ...request, cacheVersion });
      const availableKeyStrings = new Set(
        entries.map((entry) => keyOf(entry.key)),
      );

      return {
        available: entries.map((entry) => entry.key),
        missing: buildExpectedKeys(
          request.archetypes,
          request.packageIds,
          cacheVersion,
        )
          .filter((key) => !availableKeyStrings.has(key))
          .map((key) => {
            const { archetype, packageId } = parseKey(key);

            return {
              archetype,
              packageId,
              reason: MISSING_CACHE_ENTRY_REASON,
            };
          }),
      };
    },
  };
}

function toPublishedVersion(row: RSECacheVersionRow): RSEPublishedCacheVersion {
  return {
    cacheVersion: row.cache_version,
    generatedAt: row.published_at ?? row.created_at,
    co2Method: row.co2_method,
  };
}

function toCacheEntry(
  row: RSEForecastingCacheEntryRow,
): RSEForecastingCacheEntry {
  if (row.payload_schema_version !== RSE_CACHE_PAYLOAD_SCHEMA_VERSION) {
    throw new RSECacheApiError(
      `Unsupported RSE cache payload schema version: ${row.payload_schema_version}.`,
      "validation",
    );
  }

  const payload = parsePayload(row.payload);

  return {
    key: {
      cacheVersion: row.cache_version,
      packageId: row.package_id,
      archetype: {
        country: row.archetype_country,
        category: row.archetype_category,
        name: row.archetype_name,
      },
    },
    payloadSchemaVersion: RSE_CACHE_PAYLOAD_SCHEMA_VERSION,
    baseline: payload.baseline,
    renovated: payload.renovated,
    co2Comparison: payload.co2Comparison,
    generatedAt: row.created_at,
    provenance: payload.provenance,
  };
}

/** Validate that the JSONB payload from Supabase contains the four required
 *  top-level keys before casting to the domain type. */
function parsePayload(payload: unknown): RSEForecastingCachePayload {
  if (!isRecord(payload)) {
    throw new RSECacheApiError(
      "RSE cache payload is not an object.",
      "validation",
    );
  }

  if (
    !("baseline" in payload) ||
    !("renovated" in payload) ||
    !("co2Comparison" in payload) ||
    !("provenance" in payload)
  ) {
    throw new RSECacheApiError(
      "RSE cache payload is missing required fields.",
      "validation",
    );
  }

  return payload as unknown as RSEForecastingCachePayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueValues(
  archetypes: RSEArchetypeRef[],
  field: keyof RSEArchetypeRef,
): string[] {
  return [...new Set(archetypes.map((archetype) => archetype[field]))];
}

/** Build the set of exact (cacheVersion, archetype, package) keys the caller
 *  requested, so listEntries can discard Supabase rows that matched .in()
 *  filters but fall outside the intended matrix. */
function buildExpectedKeys(
  archetypes: RSEArchetypeRef[],
  packageIds: RSEPackageId[],
  cacheVersion: string,
): string[] {
  return archetypes.flatMap((archetype) =>
    packageIds.map((packageId) =>
      keyOf({
        cacheVersion,
        archetype,
        packageId,
      }),
    ),
  );
}

/** Encode a database row into the same string representation used by keyOf
 *  so client-side filtering can use simple Set lookups. */
function rowKey(row: RSEForecastingCacheEntryRow): string {
  return keyOf({
    cacheVersion: row.cache_version,
    packageId: row.package_id,
    archetype: {
      country: row.archetype_country,
      category: row.archetype_category,
      name: row.archetype_name,
    },
  });
}

/** Compact string key using the ASCII unit separator so archetype names
 *  that contain commas or spaces cannot collide with the delimiter. */
function keyOf(key: RSEForecastingCacheKey): string {
  return [
    key.cacheVersion,
    key.archetype.country,
    key.archetype.category,
    key.archetype.name,
    key.packageId,
  ].join("\u001f");
}

/** Reverse of keyOf; used by getAvailability to turn missing key strings
 *  back into structured objects for the caller. */
function parseKey(key: string): RSEForecastingCacheKey {
  const [cacheVersion, country, category, name, packageId] =
    key.split("\u001f");

  return {
    cacheVersion,
    archetype: { country, category, name },
    packageId: packageId as RSEPackageId,
  };
}
