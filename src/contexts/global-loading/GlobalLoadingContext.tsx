/**
 * Global Loading Provider
 *
 * Manages application-wide loading state with a counter-based approach
 * to handle multiple concurrent loading operations correctly.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  GlobalLoadingContext,
  type GlobalLoadingState,
  type LoadingSource,
} from "./GlobalLoadingContextDefinition";

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

/** Counter for generating unique anonymous source IDs */
let anonymousCounter = 0;

/**
 * GlobalLoadingProvider
 *
 * Wraps the application to provide global loading state management.
 * Uses a counter-based approach where:
 * - Each startLoading() increments the counter
 * - Each stopLoading() decrements the counter
 * - Overlay is visible when count > 0
 *
 * This prevents race conditions when multiple components are loading simultaneously.
 */
export function GlobalLoadingProvider({
  children,
}: GlobalLoadingProviderProps) {
  const [state, setState] = useState<GlobalLoadingState>({
    count: 0,
    sources: new Map(),
  });

  // Track which sources have been stopped to prevent double-decrement
  const stoppedSourcesRef = useRef<Set<string>>(new Set());

  const stopLoadingInternal = useCallback((sourceId: string) => {
    // Guard against double-stop
    if (stoppedSourcesRef.current.has(sourceId)) {
      return;
    }

    setState((prev) => {
      // Check if this source exists
      if (!prev.sources.has(sourceId)) {
        // Source doesn't exist - might be an anonymous source or already stopped
        // Still decrement if count > 0 to handle edge cases
        return prev;
      }

      stoppedSourcesRef.current.add(sourceId);

      const newSources = new Map(prev.sources);
      newSources.delete(sourceId);

      return {
        // Use Math.max to prevent negative counts
        count: Math.max(0, prev.count - 1),
        sources: newSources,
      };
    });
  }, []);

  const startLoading = useCallback(
    (sourceId?: string): (() => void) => {
      const id = sourceId || `anonymous-${++anonymousCounter}`;

      setState((prev) => {
        const newSources = new Map(prev.sources);
        newSources.set(id, {
          id,
          startedAt: Date.now(),
        });

        return {
          count: prev.count + 1,
          sources: newSources,
        };
      });

      // Remove from stopped sources if it was previously stopped
      stoppedSourcesRef.current.delete(id);

      // Return cleanup function
      return () => {
        stopLoadingInternal(id);
      };
    },
    [stopLoadingInternal],
  );

  const stopLoading = useCallback(
    (sourceId?: string) => {
      if (sourceId) {
        stopLoadingInternal(sourceId);
      }
      // If no sourceId provided, do nothing - this prevents accidental mass stops
      // Callers should use the cleanup function returned by startLoading instead
    },
    [stopLoadingInternal],
  );

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>, sourceId?: string): Promise<T> => {
      const stop = startLoading(sourceId);
      try {
        return await promise;
      } finally {
        stop();
      }
    },
    [startLoading],
  );

  const contextValue = useMemo(
    () => ({
      isLoading: state.count > 0,
      loadingCount: state.count,
      sources: state.sources as ReadonlyMap<string, LoadingSource>,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [state.count, state.sources, startLoading, stopLoading, withLoading],
  );

  return (
    <GlobalLoadingContext.Provider value={contextValue}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}
