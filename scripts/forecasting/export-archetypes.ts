import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { Command, CommanderError } from "commander";

import type { ArchetypeInfo } from "../../src/types/forecasting.ts";
import {
  makeArchetypeCatalogClient,
  type ArchetypeDetailResponse,
} from "./archetypes.ts";

interface ExportOptions {
  forecastingBaseUrl: string;
  forecastingServiceVersion?: string;
  out: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCatalog(value: unknown): ArchetypeInfo[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Forecasting catalogue must be a non-empty JSON array.");
  }

  const seen = new Set<string>();
  return value.map((item: unknown, index) => {
    if (
      !isRecord(item) ||
      typeof item.country !== "string" ||
      !item.country.trim() ||
      typeof item.category !== "string" ||
      !item.category.trim() ||
      typeof item.name !== "string" ||
      !item.name.trim()
    ) {
      throw new Error(
        `Invalid Forecasting catalogue identity at index ${index}.`,
      );
    }
    const ref = {
      country: item.country,
      category: item.category,
      name: item.name,
    };
    const key = JSON.stringify([ref.country, ref.category, ref.name]);
    if (seen.has(key)) {
      throw new Error(`Duplicate Forecasting catalogue identity: ${key}.`);
    }
    seen.add(key);
    return ref;
  });
}

function validateDetails(
  value: unknown,
  ref: ArchetypeInfo,
): asserts value is ArchetypeDetailResponse {
  const identity = JSON.stringify([ref.country, ref.category, ref.name]);
  if (
    !isRecord(value) ||
    value.source !== "archetype" ||
    value.country !== ref.country ||
    value.category !== ref.category ||
    value.name !== ref.name
  ) {
    throw new Error(`Forecasting detail identity does not match ${identity}.`);
  }
  for (const key of ["bui", "system", "uni11300_input_example"]) {
    if (!isRecord(value[key])) {
      throw new Error(
        `Forecasting details for ${identity} require object ${key}.`,
      );
    }
  }
}

function compareArchetypes(a: ArchetypeInfo, b: ArchetypeInfo): number {
  for (const key of ["country", "category", "name"] as const) {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
  }
  return 0;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObjectKeys(value[key])]),
  );
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(
      `${init.method} ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function getDevForecastingImage(): string | null {
  const execOptions = {
    encoding: "utf8",
    timeout: 5_000,
    stdio: "pipe",
  } as const;
  try {
    const container = execFileSync(
      "docker",
      ["compose", "ps", "--quiet", "forecasting"],
      execOptions,
    ).trim();
    if (!container) return null;
    return (
      execFileSync(
        "docker",
        ["inspect", "--format", "{{.Image}}", container],
        execOptions,
      ).trim() || null
    );
  } catch {
    // The caller reports unavailable deployment provenance before exporting.
    return null;
  }
}

export async function runExportArchetypesCli(argv: string[]): Promise<void> {
  const program = new Command()
    .name("forecasting-export-archetypes")
    .description(
      "Export the full Forecasting archetype catalogue as stable JSON",
    )
    .option(
      "--forecasting-base-url <url>",
      "API gateway base including /api; defaults to dev VITE_API_URL + /api",
      `${(process.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "")}/api`,
    )
    .option(
      "--forecasting-service-version <revision>",
      "Immutable deployed Forecasting commit SHA or image digest (operator supplied)",
    )
    .option(
      "--out <path>",
      "Output JSON file",
      ".work/forecasting/archetypes.json",
    )
    .allowExcessArguments(false)
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) return;
    throw error;
  }
  const options = program.opts<ExportOptions>();
  let baseUrl: URL;
  try {
    baseUrl = new URL(options.forecastingBaseUrl);
  } catch {
    throw new Error("--forecasting-base-url must be an absolute HTTP(S) URL.");
  }
  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      "--forecasting-base-url must be an HTTP(S) URL without query or fragment.",
    );
  }
  if (options.forecastingServiceVersion?.trim() === "" || !options.out.trim()) {
    throw new Error(
      "--forecasting-service-version and --out must not be blank.",
    );
  }

  const useDevImage =
    program.getOptionValueSource("forecastingBaseUrl") === "default" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname);
  const forecastingServiceVersion =
    options.forecastingServiceVersion ??
    (useDevImage ? getDevForecastingImage() : null);
  if (!forecastingServiceVersion) {
    process.stderr.write(
      "Could not determine the Forecasting deployment revision. Recording null; use --forecasting-service-version to supply it.\n",
    );
  }

  const client = makeArchetypeCatalogClient(baseUrl.href, requestJson);
  const catalog = parseCatalog(await client.listArchetypes()).sort(
    compareArchetypes,
  );
  const archetypes: ArchetypeDetailResponse[] = [];
  for (const ref of catalog) {
    const details = await client.getArchetypeDetails(ref);
    validateDetails(details, ref);
    archetypes.push(details);
  }

  const dataset = {
    schemaVersion: 1,
    forecastingServiceVersion,
    archetypes,
  };
  const contents = `${JSON.stringify(sortObjectKeys(dataset), null, 2)}\n`;
  const output = resolve(options.out);
  await mkdir(dirname(output), { recursive: true });
  const temporary = join(
    dirname(output),
    `.${basename(output)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  process.stdout.write(
    `Exported ${archetypes.length} archetypes to ${options.out}\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runExportArchetypesCli(process.argv.slice(2)).catch((error: unknown) => {
    // Commander already reports argument errors, including usage failures.
    if (!(error instanceof CommanderError)) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    process.exitCode = 1;
  });
}
