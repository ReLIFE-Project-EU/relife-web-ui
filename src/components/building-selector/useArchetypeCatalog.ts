import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchetypeDetails } from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import { getArchetypeKey } from "./buildingSelectorUtils";
import type { BuildingSelectorService } from "./types";

const DETAIL_PRELOAD_CONCURRENCY = 6;

function getDetailLoadErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to load reference building details.";
}

export function useArchetypeCatalog(service: BuildingSelectorService) {
  const [archetypes, setArchetypes] = useState<ArchetypeInfo[]>([]);
  const [detailsByKey, setDetailsByKey] = useState<
    Record<string, ArchetypeDetails>
  >({});
  const [detailErrorsByKey, setDetailErrorsByKey] = useState<
    Record<string, string>
  >({});
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const detailsRef = useRef<Record<string, ArchetypeDetails>>({});
  const inFlightDetailsRef = useRef<Map<string, Promise<ArchetypeDetails>>>(
    new Map(),
  );

  useEffect(() => {
    detailsRef.current = detailsByKey;
  }, [detailsByKey]);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setIsCatalogLoading(true);
      setCatalogError(null);

      try {
        const items = await service.getArchetypes();
        if (!cancelled) {
          setArchetypes(items);
          setCatalogError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Failed to load reference buildings.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [service]);

  const cacheDetails = useCallback(
    (details: ArchetypeDetails, key?: string) => {
      const detailKey = getArchetypeKey(details);
      const keys = key && key !== detailKey ? [key, detailKey] : [detailKey];
      const nextDetails = { ...detailsRef.current };
      keys.forEach((itemKey) => {
        nextDetails[itemKey] = details;
      });
      detailsRef.current = nextDetails;

      setDetailsByKey((current) => {
        const next = { ...current };
        keys.forEach((itemKey) => {
          next[itemKey] = details;
        });
        return next;
      });
      setDetailErrorsByKey((current) => {
        const next = { ...current };
        keys.forEach((itemKey) => {
          delete next[itemKey];
        });
        return next;
      });
    },
    [],
  );

  const loadDetails = useCallback(
    (archetype: ArchetypeInfo) => {
      const key = getArchetypeKey(archetype);
      const cached = detailsRef.current[key];
      if (cached) return Promise.resolve(cached);

      const inFlight = inFlightDetailsRef.current.get(key);
      if (inFlight) return inFlight;

      const request = service
        .getArchetypeDetails(archetype)
        .then((details) => {
          cacheDetails(details, key);
          return details;
        })
        .catch((error) => {
          setDetailErrorsByKey((current) => ({
            ...current,
            [key]: getDetailLoadErrorMessage(error),
          }));
          throw error;
        })
        .finally(() => {
          inFlightDetailsRef.current.delete(key);
        });

      inFlightDetailsRef.current.set(key, request);
      return request;
    },
    [cacheDetails, service],
  );

  const ensureDetails = useCallback(
    async (archetype: ArchetypeInfo) => loadDetails(archetype),
    [loadDetails],
  );

  const preloadDetails = useCallback(
    (items: ArchetypeInfo[]) => {
      const seenKeys = new Set<string>();
      const missing = items.filter((archetype) => {
        const key = getArchetypeKey(archetype);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return !detailsRef.current[key] && !inFlightDetailsRef.current.has(key);
      });
      if (missing.length === 0) return undefined;

      let cancelled = false;
      let cursor = 0;
      const workerCount = Math.min(DETAIL_PRELOAD_CONCURRENCY, missing.length);

      void Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (!cancelled) {
            const archetype = missing[cursor];
            cursor += 1;
            if (!archetype) return;

            try {
              await loadDetails(archetype);
            } catch {
              // Row-level errors are stored by loadDetails and rendered by BrowseMode.
            }
          }
        }),
      );

      return () => {
        cancelled = true;
      };
    },
    [loadDetails],
  );

  return {
    archetypes,
    detailsByKey,
    detailErrorsByKey,
    isCatalogLoading,
    catalogError,
    cacheDetails,
    ensureDetails,
    preloadDetails,
  };
}
