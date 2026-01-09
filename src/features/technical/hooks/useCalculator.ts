import { useCallback, useState } from "react";
import { useGlobalLoadingTrigger } from "../../../contexts/global-loading";

/**
 * Hook for calculator components with global loading overlay integration.
 *
 * @param apiCall - The API function to call
 * @param sourceId - Optional identifier for debugging (e.g., "EECalculator.calculate")
 */
export const useCalculator = <TRequest, TResponse>(
  apiCall: (request: TRequest) => Promise<TResponse>,
  sourceId?: string,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResponse | null>(null);
  const { withLoading } = useGlobalLoadingTrigger();

  const handleCalculate = async (request: TRequest) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await withLoading(apiCall(request), sourceId);
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    result,
    handleCalculate,
    clearResult,
  };
};
