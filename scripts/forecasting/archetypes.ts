import type { ArchetypeInfo } from "../../src/types/forecasting.ts";

/** Complete API response; nested building/system schemas belong to Forecasting. */
export interface ArchetypeDetailResponse extends ArchetypeInfo {
  source: "archetype";
  bui: unknown;
  system: unknown;
  uni11300_input_example: unknown;
  [key: string]: unknown;
}

export function makeArchetypeCatalogClient(
  baseUrl: string,
  requestJson: <T>(url: string, init: RequestInit) => Promise<T>,
) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    listArchetypes: () =>
      requestJson<ArchetypeInfo[]>(
        `${normalizedBaseUrl}/forecasting/building/available`,
        { method: "GET" },
      ),
    getArchetypeDetails: (archetype: ArchetypeInfo) => {
      const params = new URLSearchParams({
        archetype: "true",
        category: archetype.category,
        country: archetype.country,
        name: archetype.name,
      });
      return requestJson<ArchetypeDetailResponse>(
        `${normalizedBaseUrl}/forecasting/building?${params.toString()}`,
        { method: "POST" },
      );
    },
  };
}
