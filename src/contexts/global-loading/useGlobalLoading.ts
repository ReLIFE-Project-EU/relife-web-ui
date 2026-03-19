import { useContext, useEffect } from "react";
import { GlobalLoadingContext } from "./GlobalLoadingContextDefinition";

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

export function useGlobalLoadingTrigger() {
  const { startLoading, stopLoading, withLoading } =
    useContext(GlobalLoadingContext);
  return { startLoading, stopLoading, withLoading };
}

export function useGlobalLoadingState() {
  const { isLoading, loadingCount, sources } = useContext(GlobalLoadingContext);
  return { isLoading, loadingCount, sources };
}

export function useSyncGlobalLoading(isLoading: boolean, sourceId: string) {
  const { startLoading } = useContext(GlobalLoadingContext);

  useEffect(() => {
    if (isLoading) {
      return startLoading(sourceId);
    }
  }, [isLoading, sourceId, startLoading]);
}
