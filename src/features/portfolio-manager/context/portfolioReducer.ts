/**
 * Reducer for the Portfolio Manager state.
 */

import type { PortfolioAction, PortfolioState } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

export const initialState: PortfolioState = {
  portfolios: [],
  currentPortfolioId: null,
  files: [],
  quota: null,
  uploads: [],
  isLoadingPortfolios: false,
  isLoadingFiles: false,
  isUploading: false,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction,
): PortfolioState {
  switch (action.type) {
    // ─────────────────────────────────────────────────────────────────────────
    // Portfolio Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_PORTFOLIOS":
      return {
        ...state,
        portfolios: action.portfolios,
        isLoadingPortfolios: false,
      };

    case "ADD_PORTFOLIO":
      return {
        ...state,
        portfolios: [...state.portfolios, action.portfolio].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };

    case "UPDATE_PORTFOLIO":
      return {
        ...state,
        portfolios: state.portfolios.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p,
        ),
      };

    case "DELETE_PORTFOLIO": {
      const newPortfolios = state.portfolios.filter((p) => p.id !== action.id);
      const newCurrentId =
        state.currentPortfolioId === action.id
          ? (newPortfolios[0]?.id ?? null)
          : state.currentPortfolioId;
      return {
        ...state,
        portfolios: newPortfolios,
        currentPortfolioId: newCurrentId,
        files: state.currentPortfolioId === action.id ? [] : state.files,
      };
    }

    case "SELECT_PORTFOLIO":
      return {
        ...state,
        currentPortfolioId: action.id,
        files: [], // Clear files when switching portfolios
        isLoadingFiles: action.id !== null,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // File Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_FILES":
      return {
        ...state,
        files: action.files,
        isLoadingFiles: false,
      };

    case "ADD_FILE": {
      // Update portfolio file count
      const updatedPortfolios = state.portfolios.map((p) =>
        p.id === action.file.portfolioId
          ? { ...p, fileCount: p.fileCount + 1 }
          : p,
      );
      return {
        ...state,
        files: [action.file, ...state.files],
        portfolios: updatedPortfolios,
      };
    }

    case "UPDATE_FILE":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, ...action.updates } : f,
        ),
      };

    case "DELETE_FILE": {
      const fileToDelete = state.files.find((f) => f.id === action.id);
      const updatedPortfolios = fileToDelete
        ? state.portfolios.map((p) =>
            p.id === fileToDelete.portfolioId
              ? { ...p, fileCount: Math.max(0, p.fileCount - 1) }
              : p,
          )
        : state.portfolios;
      return {
        ...state,
        files: state.files.filter((f) => f.id !== action.id),
        portfolios: updatedPortfolios,
      };
    }

    case "MOVE_FILE": {
      const movedFile = state.files.find((f) => f.id === action.fileId);
      if (!movedFile) return state;

      const fromPortfolioId = movedFile.portfolioId;
      const toPortfolioId = action.toPortfolioId;

      // Update portfolio file counts
      const updatedPortfolios = state.portfolios.map((p) => {
        if (p.id === fromPortfolioId) {
          return { ...p, fileCount: Math.max(0, p.fileCount - 1) };
        }
        if (p.id === toPortfolioId) {
          return { ...p, fileCount: p.fileCount + 1 };
        }
        return p;
      });

      // Remove file from current view if it's being moved away
      const updatedFiles =
        state.currentPortfolioId === fromPortfolioId
          ? state.files.filter((f) => f.id !== action.fileId)
          : state.files;

      return {
        ...state,
        files: updatedFiles,
        portfolios: updatedPortfolios,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upload Progress Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "START_UPLOAD":
      return {
        ...state,
        uploads: [
          ...state.uploads,
          {
            fileId: action.fileId,
            filename: action.filename,
            progress: 0,
            status: "pending",
          },
        ],
        isUploading: true,
      };

    case "UPDATE_UPLOAD_PROGRESS":
      return {
        ...state,
        uploads: state.uploads.map((u) =>
          u.fileId === action.fileId
            ? { ...u, progress: action.progress, status: "uploading" }
            : u,
        ),
      };

    case "COMPLETE_UPLOAD": {
      const updatedUploads = state.uploads.map((u) =>
        u.fileId === action.fileId
          ? { ...u, progress: 100, status: "complete" as const }
          : u,
      );
      const stillUploading = updatedUploads.some(
        (u) => u.status === "pending" || u.status === "uploading",
      );
      return {
        ...state,
        uploads: updatedUploads,
        isUploading: stillUploading,
      };
    }

    case "FAIL_UPLOAD": {
      const updatedUploads = state.uploads.map((u) =>
        u.fileId === action.fileId
          ? { ...u, status: "error" as const, error: action.error }
          : u,
      );
      const stillUploading = updatedUploads.some(
        (u) => u.status === "pending" || u.status === "uploading",
      );
      return {
        ...state,
        uploads: updatedUploads,
        isUploading: stillUploading,
      };
    }

    case "CLEAR_COMPLETED_UPLOADS":
      return {
        ...state,
        uploads: state.uploads.filter(
          (u) => u.status === "pending" || u.status === "uploading",
        ),
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Quota Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_QUOTA":
      return {
        ...state,
        quota: action.quota,
      };

    case "UPDATE_QUOTA_USAGE": {
      if (!state.quota) return state;
      const newUsedBytes = Math.max(0, state.quota.usedBytes + action.delta);
      return {
        ...state,
        quota: {
          ...state.quota,
          usedBytes: newUsedBytes,
          usedPercentage:
            state.quota.maxBytes > 0
              ? (newUsedBytes / state.quota.maxBytes) * 100
              : 0,
        },
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Loading State Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_LOADING_PORTFOLIOS":
      return {
        ...state,
        isLoadingPortfolios: action.loading,
      };

    case "SET_LOADING_FILES":
      return {
        ...state,
        isLoadingFiles: action.loading,
      };

    case "SET_UPLOADING":
      return {
        ...state,
        isUploading: action.uploading,
      };

    // ─────────────────────────────────────────────────────────────────────────
    // Error Actions
    // ─────────────────────────────────────────────────────────────────────────
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}
