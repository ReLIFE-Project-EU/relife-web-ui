import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { beforeAll, describe, expect, test } from "vitest";

import * as api from "./helpers/api-client";

const EPW_FILENAME = "GRC_Athens.167160_IWEC.epw";
const EPW_PATH = path.resolve(
  process.cwd(),
  "external-services/relife-forecasting-service/src/relife_forecasting/epw_weather",
  EPW_FILENAME,
);
const CONCURRENCY_SPEEDUP_THRESHOLD = 0.75;
const CONCURRENCY_LEVELS = [2, 4] as const;
const PREFERRED_ARCHETYPE = {
  category: "Single Family House",
  country: "Greece",
  name: "SFH_Greece_1961_1980",
};

interface ArchetypeDescriptor {
  category: string;
  country: string;
  name: string;
}

async function createEpwFormData(): Promise<FormData> {
  const formData = new FormData();
  const epwBuffer = await readFile(EPW_PATH);
  const epwBlob = new Blob([epwBuffer], { type: "application/octet-stream" });

  formData.append("epw_file", epwBlob, EPW_FILENAME);

  return formData;
}

async function discoverArchetype(): Promise<ArchetypeDescriptor> {
  const response = await api.get<ArchetypeDescriptor[]>(
    "/forecasting/building/available",
  );

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);

  return (
    response.body.find(
      (archetype) =>
        archetype.category === PREFERRED_ARCHETYPE.category &&
        archetype.country === PREFERRED_ARCHETYPE.country &&
        archetype.name === PREFERRED_ARCHETYPE.name,
    ) ?? response.body[0]
  );
}

async function runSimulateRequest(archetype: ArchetypeDescriptor) {
  const searchParams = new URLSearchParams({
    archetype: "true",
    category: archetype.category,
    country: archetype.country,
    name: archetype.name,
    weather_source: "epw",
  });
  const response = await api.postForm(
    `/forecasting/simulate?${searchParams.toString()}`,
    await createEpwFormData(),
  );
  const body = response.body as {
    results?: { hourly_building?: Array<Record<string, unknown>> };
  };

  expect(response.status).toBe(200);
  expect(Array.isArray(body.results?.hourly_building)).toBe(true);
  expect(body.results?.hourly_building?.length).toBeGreaterThan(8000);

  return response;
}

async function runSequentialRequests(
  archetype: ArchetypeDescriptor,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await runSimulateRequest(archetype);
  }
}

async function runConcurrentRequests(
  archetype: ArchetypeDescriptor,
  count: number,
): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, () => runSimulateRequest(archetype)),
  );
}

async function measureRun(
  label: string,
  runner: () => Promise<unknown>,
): Promise<number> {
  const start = performance.now();
  await runner();
  const elapsedMs = performance.now() - start;

  console.log(`${label}: ${elapsedMs.toFixed(0)} ms`);

  return elapsedMs;
}

describe.sequential("Forecasting concurrency smoke", () => {
  beforeAll(() => {
    api.clearRequestHistory();
  });

  test("EPW simulations are materially faster when workers can serve them concurrently", async () => {
    const archetype = await discoverArchetype();

    console.log(
      `Using archetype: ${archetype.category} / ${archetype.country} / ${archetype.name}`,
    );

    await runSimulateRequest(archetype);

    for (const concurrencyLevel of CONCURRENCY_LEVELS) {
      const sequentialMs = await measureRun(
        `sequential simulate x${concurrencyLevel}`,
        () => runSequentialRequests(archetype, concurrencyLevel),
      );
      const concurrentMs = await measureRun(
        `concurrent simulate x${concurrencyLevel}`,
        () => runConcurrentRequests(archetype, concurrencyLevel),
      );

      const ratio = concurrentMs / sequentialMs;

      console.log(
        `x${concurrencyLevel} concurrent/sequential ratio: ${ratio.toFixed(3)} (threshold ${CONCURRENCY_SPEEDUP_THRESHOLD})`,
      );

      expect(ratio).toBeLessThanOrEqual(CONCURRENCY_SPEEDUP_THRESHOLD);
    }
  });
});
