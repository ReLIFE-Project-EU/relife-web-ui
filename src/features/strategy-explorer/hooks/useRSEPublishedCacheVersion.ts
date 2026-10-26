import { useEffect, useState } from "react";
import { RSECacheApiError } from "../api/rseCacheApi";
import { rseForecastingCacheService } from "../services/rseForecastingCacheService";

type PublishedCacheVersionState =
  | { status: "loading" | "not-found" | "unavailable" }
  | { status: "ready"; cacheVersion: string };

export function useRSEPublishedCacheVersion(): PublishedCacheVersionState {
  const [state, setState] = useState<PublishedCacheVersionState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    rseForecastingCacheService
      .getPublishedVersion()
      .then(({ cacheVersion }) => {
        if (!cancelled) {
          setState({ status: "ready", cacheVersion });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status:
              error instanceof RSECacheApiError && error.code === "not-found"
                ? "not-found"
                : "unavailable",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
