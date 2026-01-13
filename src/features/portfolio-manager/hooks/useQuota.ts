/**
 * Hook for accessing storage quota information.
 */

import { useContext, useCallback } from "react";
import { quotaApi } from "../api";
import { PortfolioContext } from "../context/PortfolioContextDefinition";
import type { StorageQuota } from "../types";

export function useQuota(): {
  quota: StorageQuota | null;
  refreshQuota: () => Promise<void>;
  checkUploadAllowed: (fileSize: number) => boolean;
  getQuotaColor: () => "green" | "yellow" | "red";
  formatBytes: (bytes: number) => string;
} {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error("useQuota must be used within a PortfolioProvider");
  }

  const { state, dispatch } = context;

  const refreshQuota = useCallback(async () => {
    try {
      const quota = await quotaApi.get();
      dispatch({ type: "SET_QUOTA", quota });
    } catch (err) {
      console.error("Failed to refresh quota:", err);
    }
  }, [dispatch]);

  /**
   * Check if a file of given size can be uploaded
   */
  const checkUploadAllowed = useCallback(
    (fileSize: number): boolean => {
      if (!state.quota) return true; // Optimistic default
      return state.quota.usedBytes + fileSize <= state.quota.maxBytes;
    },
    [state.quota],
  );

  /**
   * Get color based on quota usage percentage
   */
  const getQuotaColor = useCallback((): "green" | "yellow" | "red" => {
    if (!state.quota) return "green";
    const percentage = state.quota.usedPercentage;
    if (percentage >= 90) return "red";
    if (percentage >= 70) return "yellow";
    return "green";
  }, [state.quota]);

  /**
   * Format bytes to human-readable string
   */
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  return {
    quota: state.quota,
    refreshQuota,
    checkUploadAllowed,
    getQuotaColor,
    formatBytes,
  };
}
