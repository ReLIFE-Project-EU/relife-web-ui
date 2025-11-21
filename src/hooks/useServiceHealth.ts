import { useEffect, useState } from "react";
import { api } from "../api";

export interface ServiceHealthStatus {
  financial: boolean;
  technical: boolean;
  forecasting: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useServiceHealth = (autoRefresh?: number) => {
  const [status, setStatus] = useState<ServiceHealthStatus>({
    financial: false,
    technical: false,
    forecasting: false,
    isLoading: true,
    error: null,
  });

  const checkServices = async () => {
    console.debug("[useServiceHealth] Starting service health check");
    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    const results = await Promise.allSettled([
      api.financial.ping(),
      api.technical.ping(),
      api.forecasting.ping(),
    ]);

    console.debug("[useServiceHealth] Health check results:", {
      financial: results[0].status,
      technical: results[1].status,
      forecasting: results[2].status,
    });

    const newStatus = {
      financial: results[0].status === "fulfilled",
      technical: results[1].status === "fulfilled",
      forecasting: results[2].status === "fulfilled",
      isLoading: false,
      error: results.every((r) => r.status === "rejected")
        ? "All services unavailable"
        : null,
    };

    console.debug("[useServiceHealth] Updated status:", newStatus);
    setStatus(newStatus);
  };

  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      if (!mounted) return;
      await checkServices();
    };

    runCheck();

    if (autoRefresh && autoRefresh > 0) {
      const interval = setInterval(runCheck, autoRefresh);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      mounted = false;
    };
  }, [autoRefresh]);

  return { ...status, refresh: checkServices };
};
