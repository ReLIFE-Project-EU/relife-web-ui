import { useContext, useEffect } from "react";
import { GlobalLoadingContext } from "./GlobalLoadingContextDefinition";

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
