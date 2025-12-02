import { useState } from "react";
import { DEFAULT_PROFILE } from "../utils";

export const useCalculator = <TRequest, TResponse>(
  apiCall: (request: TRequest) => Promise<TResponse>,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResponse | null>(null);
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  const handleCalculate = async (request: TRequest) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiCall(request);
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

  return {
    loading,
    error,
    result,
    profile,
    setProfile,
    handleCalculate,
  };
};
