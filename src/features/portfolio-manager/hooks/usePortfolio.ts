/**
 * Hook for accessing and managing portfolios.
 */

import { useCallback, useContext } from "react";
import { portfolioApi } from "../api";
import { PortfolioContext } from "../context/PortfolioContextDefinition";
import type { PortfolioContextValue } from "../context/PortfolioContextDefinition";
import { normalizeErrorMessage, getISOTimestamp } from "../utils";

// Re-export context value type for convenience
export type { PortfolioContextValue };

// ─────────────────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolio(): PortfolioContextValue & {
  // Computed values
  currentPortfolio:
    | ReturnType<typeof usePortfolio>["state"]["portfolios"][0]
    | null;
  // Actions
  createPortfolio: (name: string, description?: string) => Promise<void>;
  renamePortfolio: (id: string, name: string) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  selectPortfolio: (id: string | null) => void;
  refreshPortfolios: () => Promise<void>;
} {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }

  const { state, dispatch } = context;

  // Computed values
  const currentPortfolio =
    state.portfolios.find((p) => p.id === state.currentPortfolioId) ?? null;

  // Actions
  const createPortfolio = useCallback(
    async (name: string, description?: string) => {
      try {
        const portfolio = await portfolioApi.create(name, description);
        dispatch({ type: "ADD_PORTFOLIO", portfolio });
        dispatch({ type: "SELECT_PORTFOLIO", id: portfolio.id });
      } catch (err) {
        const message = normalizeErrorMessage(
          err,
          "Failed to create portfolio",
        );
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  const renamePortfolio = useCallback(
    async (id: string, name: string) => {
      try {
        await portfolioApi.rename(id, name);
        dispatch({
          type: "UPDATE_PORTFOLIO",
          id,
          updates: { name, updatedAt: getISOTimestamp() },
        });
      } catch (err) {
        const message = normalizeErrorMessage(
          err,
          "Failed to rename portfolio",
        );
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  const deletePortfolio = useCallback(
    async (id: string) => {
      try {
        await portfolioApi.delete(id);
        dispatch({ type: "DELETE_PORTFOLIO", id });
      } catch (err) {
        const message = normalizeErrorMessage(
          err,
          "Failed to delete portfolio",
        );
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  const selectPortfolio = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT_PORTFOLIO", id });
    },
    [dispatch],
  );

  const refreshPortfolios = useCallback(async () => {
    dispatch({ type: "SET_LOADING_PORTFOLIOS", loading: true });
    try {
      const portfolios = await portfolioApi.list();
      dispatch({ type: "SET_PORTFOLIOS", portfolios });
    } catch (err) {
      const message = normalizeErrorMessage(
        err,
        "Failed to refresh portfolios",
      );
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [dispatch]);

  return {
    state,
    dispatch,
    currentPortfolio,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    selectPortfolio,
    refreshPortfolios,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all portfolios
 */
export function usePortfolios() {
  const { state } = usePortfolio();
  return state.portfolios;
}

/**
 * Get current portfolio ID
 */
export function useCurrentPortfolioId() {
  const { state } = usePortfolio();
  return state.currentPortfolioId;
}

/**
 * Get loading state for portfolios
 */
export function usePortfoliosLoading() {
  const { state } = usePortfolio();
  return state.isLoadingPortfolios;
}
