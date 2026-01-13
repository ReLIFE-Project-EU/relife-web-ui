/**
 * State and action types for the Portfolio Manager.
 */

import type {
  Portfolio,
  PortfolioFile,
  StorageQuota,
  UploadProgress,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// State Shape
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioState {
  // Data
  portfolios: Portfolio[];
  currentPortfolioId: string | null;
  files: PortfolioFile[];
  quota: StorageQuota | null;
  uploads: UploadProgress[];

  // Loading states
  isLoadingPortfolios: boolean;
  isLoadingFiles: boolean;
  isUploading: boolean;

  // Error state
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────────────

export type PortfolioAction =
  // Portfolio actions
  | { type: "SET_PORTFOLIOS"; portfolios: Portfolio[] }
  | { type: "ADD_PORTFOLIO"; portfolio: Portfolio }
  | { type: "UPDATE_PORTFOLIO"; id: string; updates: Partial<Portfolio> }
  | { type: "DELETE_PORTFOLIO"; id: string }
  | { type: "SELECT_PORTFOLIO"; id: string | null }

  // File actions
  | { type: "SET_FILES"; files: PortfolioFile[] }
  | { type: "ADD_FILE"; file: PortfolioFile }
  | { type: "UPDATE_FILE"; id: string; updates: Partial<PortfolioFile> }
  | { type: "DELETE_FILE"; id: string }
  | { type: "MOVE_FILE"; fileId: string; toPortfolioId: string }

  // Upload progress actions
  | { type: "START_UPLOAD"; fileId: string; filename: string }
  | { type: "UPDATE_UPLOAD_PROGRESS"; fileId: string; progress: number }
  | { type: "COMPLETE_UPLOAD"; fileId: string }
  | { type: "FAIL_UPLOAD"; fileId: string; error: string }
  | { type: "CLEAR_COMPLETED_UPLOADS" }

  // Quota actions
  | { type: "SET_QUOTA"; quota: StorageQuota }
  | { type: "UPDATE_QUOTA_USAGE"; delta: number }

  // Loading state actions
  | { type: "SET_LOADING_PORTFOLIOS"; loading: boolean }
  | { type: "SET_LOADING_FILES"; loading: boolean }
  | { type: "SET_UPLOADING"; uploading: boolean }

  // Error actions
  | { type: "SET_ERROR"; error: string | null }
  | { type: "CLEAR_ERROR" };
