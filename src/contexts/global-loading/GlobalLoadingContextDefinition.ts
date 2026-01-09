/**
 * Global Loading Context Type Definitions
 *
 * Provides types for the application-wide loading overlay system
 * that supports multiple concurrent loading operations with source tracking.
 */

import { createContext } from "react";

/**
 * Represents a loading source with metadata for debugging.
 */
export interface LoadingSource {
  /** Unique identifier for the loading source (e.g., "HomeAssistant.estimate") */
  id: string;
  /** Timestamp when loading started */
  startedAt: number;
}

/**
 * Internal state for the global loading system.
 */
export interface GlobalLoadingState {
  /** Current count of active loading operations */
  count: number;
  /** Map of active loading sources for debugging */
  sources: Map<string, LoadingSource>;
}

/**
 * Context value exposed to consumers.
 */
export interface GlobalLoadingContextValue {
  /** Whether any loading operation is active */
  isLoading: boolean;
  /** Number of concurrent loading operations */
  loadingCount: number;
  /** Active loading sources (for debugging) */
  sources: ReadonlyMap<string, LoadingSource>;
  /**
   * Start a loading operation.
   * @param sourceId Optional identifier for debugging (e.g., "ComponentName.action")
   * @returns Cleanup function that stops this loading operation
   */
  startLoading: (sourceId?: string) => () => void;
  /**
   * Stop a loading operation.
   * @param sourceId Optional identifier matching the one passed to startLoading
   */
  stopLoading: (sourceId?: string) => void;
  /**
   * Wrap a promise with loading state management.
   * @param promise The promise to wrap
   * @param sourceId Optional identifier for debugging
   * @returns The promise result
   */
  withLoading: <T>(promise: Promise<T>, sourceId?: string) => Promise<T>;
}

/**
 * Default context value for when provider is not present.
 * Operations are no-ops to prevent runtime errors.
 */
const defaultContextValue: GlobalLoadingContextValue = {
  isLoading: false,
  loadingCount: 0,
  sources: new Map(),
  startLoading: () => () => {},
  stopLoading: () => {},
  withLoading: async <T>(promise: Promise<T>) => promise,
};

/**
 * Global Loading Context
 *
 * Provides application-wide loading state management with:
 * - Counter-based tracking (prevents race conditions)
 * - Source identification (for debugging stuck overlays)
 * - Cleanup functions (ideal for useEffect patterns)
 */
export const GlobalLoadingContext =
  createContext<GlobalLoadingContextValue>(defaultContextValue);
