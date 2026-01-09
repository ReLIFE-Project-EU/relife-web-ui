/**
 * Global Loading Hooks
 *
 * Consumer hooks for the global loading overlay system.
 * Provides different hooks for different use cases:
 * - useGlobalLoading: Full hook with all features
 * - useGlobalLoadingTrigger: Just start/stop/withLoading (for components that trigger loading)
 * - useGlobalLoadingState: Just state reading (for overlay component)
 */

import { useContext, useEffect } from "react";
import { GlobalLoadingContext } from "./GlobalLoadingContextDefinition";

/**
 * Full hook with all global loading features.
 *
 * @example
 * ```tsx
 * const { startLoading, stopLoading, withLoading, isLoading } = useGlobalLoading();
 *
 * // Manual control
 * const handleSubmit = async () => {
 *   startLoading('MyComponent.submit');
 *   try {
 *     await doWork();
 *   } finally {
 *     stopLoading('MyComponent.submit');
 *   }
 * };
 *
 * // Or use withLoading wrapper
 * const result = await withLoading(api.call(), 'MyComponent.api');
 * ```
 */
export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

/**
 * Hook for components that only need to trigger loading.
 * Returns just the action methods, not the state.
 *
 * @example
 * ```tsx
 * const { startLoading, stopLoading, withLoading } = useGlobalLoadingTrigger();
 * ```
 */
export function useGlobalLoadingTrigger() {
  const { startLoading, stopLoading, withLoading } =
    useContext(GlobalLoadingContext);
  return { startLoading, stopLoading, withLoading };
}

/**
 * Hook for components that only need to read loading state.
 * Returns just the state, not the action methods.
 *
 * @example
 * ```tsx
 * const { isLoading, loadingCount, sources } = useGlobalLoadingState();
 * ```
 */
export function useGlobalLoadingState() {
  const { isLoading, loadingCount, sources } = useContext(GlobalLoadingContext);
  return { isLoading, loadingCount, sources };
}

/**
 * Hook to sync a local boolean loading state to the global loading system.
 * Useful for integrating existing loading states without refactoring.
 *
 * @param isLoading - Local loading state boolean
 * @param sourceId - Identifier for debugging
 *
 * @example
 * ```tsx
 * // Sync existing loading state to global overlay
 * useSyncGlobalLoading(isEstimating, 'HomeAssistant.estimate');
 * useSyncGlobalLoading(isEvaluating, 'HomeAssistant.evaluate');
 * useSyncGlobalLoading(isRanking, 'HomeAssistant.rank');
 * ```
 */
export function useSyncGlobalLoading(isLoading: boolean, sourceId: string) {
  const { startLoading } = useContext(GlobalLoadingContext);

  useEffect(() => {
    if (isLoading) {
      // startLoading returns a cleanup function that calls stopLoading
      return startLoading(sourceId);
    }
  }, [isLoading, sourceId, startLoading]);
}
