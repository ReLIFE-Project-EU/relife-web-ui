// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useArchetypeCatalog } from "../../../src/components/building-selector/useArchetypeCatalog";
import { getArchetypeKey } from "../../../src/components/building-selector/buildingSelectorUtils";
import type { BuildingSelectorService } from "../../../src/components/building-selector";
import type { ArchetypeDetails } from "../../../src/types/archetype";
import type { ArchetypeInfo } from "../../../src/types/forecasting";

function createArchetype(index: number): ArchetypeInfo {
  return {
    category: "Single Family House",
    country: "France",
    name: `FR_SFH_198${index}_198${index}`,
  };
}

function createDetails(archetype: ArchetypeInfo): ArchetypeDetails {
  return {
    ...archetype,
    floorArea: 100,
    numberOfFloors: 2,
    floorHeight: 2.8,
    totalWindowArea: 16,
    thermalProperties: {
      wallUValue: 1.1,
      roofUValue: 0.8,
      windowUValue: 2.3,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    location: {
      lat: 48.8566,
      lng: 2.3522,
    },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
  };
}

function createService(
  archetypes: ArchetypeInfo[],
  getArchetypeDetails: BuildingSelectorService["getArchetypeDetails"],
): BuildingSelectorService {
  return {
    detectCountryFromCoords: vi.fn(() => "France"),
    findMatchingArchetype: vi.fn(),
    getArchetypeDetails,
    getArchetypes: vi.fn(async () => archetypes),
    getAvailableCategories: vi.fn(async () => ["Single Family House"]),
    getAvailablePeriods: vi.fn(async () => ({
      periods: ["1980-1989"],
      recommendedPeriod: "1980-1989",
      detectedCountry: "France",
      sourceCountry: "France",
      scope: "local" as const,
      reason: null,
    })),
  };
}

describe("useArchetypeCatalog", () => {
  test("preloads visible details with bounded concurrency and row-level errors", async () => {
    const archetypes = Array.from({ length: 10 }, (_, index) =>
      createArchetype(index),
    );
    const failingKey = getArchetypeKey(archetypes[1]);
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const service = createService(
      archetypes,
      vi.fn(async (archetype) => {
        activeRequests += 1;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeRequests -= 1;
        if (getArchetypeKey(archetype) === failingKey) {
          throw new Error("detail service unavailable");
        }
        return createDetails(archetype);
      }),
    );

    const { result } = renderHook(() => useArchetypeCatalog(service));
    await waitFor(() => expect(result.current.isCatalogLoading).toBe(false));

    act(() => {
      result.current.preloadDetails(archetypes);
    });

    await waitFor(() =>
      expect(Object.keys(result.current.detailsByKey)).toHaveLength(9),
    );
    await waitFor(() =>
      expect(result.current.detailErrorsByKey[failingKey]).toBe(
        "detail service unavailable",
      ),
    );
    expect(maxActiveRequests).toBeLessThanOrEqual(6);
  });
});
