/**
 * Global Loading Context
 *
 * Application-wide loading overlay system that multiple components
 * can trigger collaboratively with proper race condition handling.
 */

// Context and Provider
export { GlobalLoadingContext } from "./GlobalLoadingContextDefinition";
export type {
  GlobalLoadingContextValue,
  GlobalLoadingState,
  LoadingSource,
} from "./GlobalLoadingContextDefinition";
export { GlobalLoadingProvider } from "./GlobalLoadingContext";

// Consumer Hooks
export {
  useGlobalLoading,
  useGlobalLoadingState,
  useGlobalLoadingTrigger,
  useSyncGlobalLoading,
} from "./useGlobalLoading";
