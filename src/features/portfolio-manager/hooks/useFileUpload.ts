/**
 * Hook for file upload operations.
 */

import { useCallback, useContext } from "react";
import { fileApi, quotaApi } from "../api";
import { PortfolioContext } from "../context/PortfolioContextDefinition";
import type { PortfolioFile } from "../types";
import { normalizeErrorMessage, getISOTimestamp } from "../utils";

export function useFileUpload() {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error("useFileUpload must be used within a PortfolioProvider");
  }

  const { state, dispatch } = context;

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (file: File): Promise<PortfolioFile | null> => {
      if (!state.currentPortfolioId) {
        dispatch({ type: "SET_ERROR", error: "No portfolio selected" });
        return null;
      }

      const fileId = crypto.randomUUID();
      dispatch({ type: "START_UPLOAD", fileId, filename: file.name });

      try {
        // Simulate progress (Supabase doesn't provide upload progress)
        dispatch({ type: "UPDATE_UPLOAD_PROGRESS", fileId, progress: 25 });

        const uploadedFile = await fileApi.upload(
          state.currentPortfolioId,
          file,
        );

        dispatch({ type: "UPDATE_UPLOAD_PROGRESS", fileId, progress: 100 });
        dispatch({ type: "COMPLETE_UPLOAD", fileId });
        dispatch({ type: "ADD_FILE", file: uploadedFile });
        dispatch({ type: "UPDATE_QUOTA_USAGE", delta: file.size });

        return uploadedFile;
      } catch (err) {
        const message = normalizeErrorMessage(err, "Failed to upload file");
        dispatch({ type: "FAIL_UPLOAD", fileId, error: message });
        return null;
      }
    },
    [state.currentPortfolioId, dispatch],
  );

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<PortfolioFile[]> => {
      const results: PortfolioFile[] = [];

      for (const file of files) {
        const uploaded = await uploadFile(file);
        if (uploaded) {
          results.push(uploaded);
        }
      }

      return results;
    },
    [uploadFile],
  );

  /**
   * Delete a file
   */
  const deleteFile = useCallback(
    async (file: PortfolioFile): Promise<void> => {
      try {
        await fileApi.delete(file);
        dispatch({ type: "DELETE_FILE", id: file.id });
        dispatch({ type: "UPDATE_QUOTA_USAGE", delta: -file.fileSize });
      } catch (err) {
        const message = normalizeErrorMessage(err, "Failed to delete file");
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  /**
   * Rename a file
   */
  const renameFile = useCallback(
    async (fileId: string, newFilename: string): Promise<void> => {
      try {
        await fileApi.rename(fileId, newFilename);
        dispatch({
          type: "UPDATE_FILE",
          id: fileId,
          updates: {
            originalFilename: newFilename,
            updatedAt: getISOTimestamp(),
          },
        });
      } catch (err) {
        const message = normalizeErrorMessage(err, "Failed to rename file");
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  /**
   * Move a file to another portfolio
   */
  const moveFile = useCallback(
    async (fileId: string, toPortfolioId: string): Promise<void> => {
      try {
        await fileApi.move(fileId, toPortfolioId);
        dispatch({ type: "MOVE_FILE", fileId, toPortfolioId });
      } catch (err) {
        const message = normalizeErrorMessage(err, "Failed to move file");
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  /**
   * Download a file
   */
  const downloadFile = useCallback(
    async (file: PortfolioFile): Promise<void> => {
      try {
        const blob = await fileApi.download(file);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.originalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        const message = normalizeErrorMessage(err, "Failed to download file");
        dispatch({ type: "SET_ERROR", error: message });
        throw err;
      }
    },
    [dispatch],
  );

  /**
   * Refresh quota after operations
   */
  const refreshQuota = useCallback(async () => {
    try {
      const quota = await quotaApi.get();
      dispatch({ type: "SET_QUOTA", quota });
    } catch (err) {
      console.error("Failed to refresh quota:", err);
    }
  }, [dispatch]);

  /**
   * Clear completed uploads from the list
   */
  const clearCompletedUploads = useCallback(() => {
    dispatch({ type: "CLEAR_COMPLETED_UPLOADS" });
  }, [dispatch]);

  return {
    // State
    files: state.files,
    uploads: state.uploads,
    isUploading: state.isUploading,
    isLoadingFiles: state.isLoadingFiles,

    // Actions
    uploadFile,
    uploadFiles,
    deleteFile,
    renameFile,
    moveFile,
    downloadFile,
    refreshQuota,
    clearCompletedUploads,
  };
}
