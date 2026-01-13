/**
 * React Context Provider for the Portfolio Manager.
 * Provides state and dispatch to all child components.
 */

import { useEffect, useReducer, type ReactNode } from "react";
import { portfolioApi, quotaApi, fileApi } from "../api";
import { PortfolioContext } from "./PortfolioContextDefinition";
import { portfolioReducer, initialState } from "./portfolioReducer";

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioProviderProps {
  children: ReactNode;
}

export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);

  // Load portfolios and quota on mount
  useEffect(() => {
    async function loadInitialData() {
      dispatch({ type: "SET_LOADING_PORTFOLIOS", loading: true });

      try {
        const [portfolios, quota] = await Promise.all([
          portfolioApi.list(),
          quotaApi.get(),
        ]);

        dispatch({ type: "SET_PORTFOLIOS", portfolios });
        dispatch({ type: "SET_QUOTA", quota });

        // Auto-select first portfolio if available
        if (portfolios.length > 0) {
          dispatch({ type: "SELECT_PORTFOLIO", id: portfolios[0].id });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load portfolios";
        dispatch({ type: "SET_ERROR", error: message });
        dispatch({ type: "SET_LOADING_PORTFOLIOS", loading: false });
      }
    }

    loadInitialData();
  }, []);

  // Load files when portfolio selection changes
  useEffect(() => {
    async function loadFiles() {
      if (!state.currentPortfolioId) {
        dispatch({ type: "SET_FILES", files: [] });
        return;
      }

      dispatch({ type: "SET_LOADING_FILES", loading: true });

      try {
        const files = await fileApi.listByPortfolio(state.currentPortfolioId);
        dispatch({ type: "SET_FILES", files });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load files";
        dispatch({ type: "SET_ERROR", error: message });
        dispatch({ type: "SET_LOADING_FILES", loading: false });
      }
    }

    loadFiles();
  }, [state.currentPortfolioId]);

  return (
    <PortfolioContext.Provider value={{ state, dispatch }}>
      {children}
    </PortfolioContext.Provider>
  );
}
