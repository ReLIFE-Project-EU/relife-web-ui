/**
 * File API - Upload, download, and manage portfolio files.
 */

import { supabase } from "../../../auth";
import { FILE_UPLOAD_CONFIG, STORAGE_BUCKET } from "../constants";
import {
  PortfolioApiError,
  type PortfolioFile,
  type PortfolioFileRow,
} from "../types";
import {
  requireAuthenticatedUser,
  buildStoragePath,
  getISOTimestamp,
} from "../utils";
import { quotaApi } from "./quotaApi";
import { wrapPortfolioApiError } from "./errors";

/**
 * Transform database row to PortfolioFile interface
 */
function toPortfolioFile(row: PortfolioFileRow): PortfolioFile {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    originalFilename: row.original_filename,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const fileApi = {
  /**
   * List all files in a portfolio.
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async listByPortfolio(portfolioId: string): Promise<PortfolioFile[]> {
    try {
      const user = await requireAuthenticatedUser();

      const { data, error } = await supabase
        .from("portfolio_files")
        .select("*")
        .eq("portfolio_id", portfolioId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw wrapPortfolioApiError(
          "Failed to load portfolio files.",
          "database",
          error,
        );
      }
      return (data as PortfolioFileRow[]).map(toPortfolioFile);
    } catch (error) {
      throw wrapPortfolioApiError(
        "Failed to load portfolio files.",
        "database",
        error,
      );
    }
  },

  /**
   * Upload a file to a portfolio.
   * Uses sanitized filename to prevent path traversal attacks.
   */
  async upload(portfolioId: string, file: File): Promise<PortfolioFile> {
    try {
      const user = await requireAuthenticatedUser();

      if (
        !FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(
          file.type as (typeof FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES)[number],
        )
      ) {
        throw new PortfolioApiError(
          `File type not allowed: ${file.type}`,
          "validation",
        );
      }

      if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        throw new PortfolioApiError(
          "File exceeds maximum size of 50MB",
          "validation",
        );
      }

      const hasQuota = await quotaApi.checkUploadAllowed(file.size);
      if (!hasQuota) {
        throw new PortfolioApiError("Storage quota exceeded", "quota");
      }

      const fileId = crypto.randomUUID();
      const storagePath = buildStoragePath(
        user.id,
        portfolioId,
        fileId,
        file.name,
      );

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw wrapPortfolioApiError(
          "Failed to upload file to storage.",
          "storage",
          uploadError,
        );
      }

      const { data, error: dbError } = await supabase
        .from("portfolio_files")
        .insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          original_filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw wrapPortfolioApiError(
          "Failed to save uploaded file metadata.",
          "database",
          dbError,
        );
      }

      return toPortfolioFile(data as PortfolioFileRow);
    } catch (error) {
      throw wrapPortfolioApiError("Failed to upload file.", "storage", error);
    }
  },

  /**
   * Download a file
   */
  async download(file: PortfolioFile): Promise<Blob> {
    try {
      await requireAuthenticatedUser();

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(file.storagePath);

      if (error) {
        throw wrapPortfolioApiError(
          "Failed to download file.",
          "storage",
          error,
        );
      }
      return data;
    } catch (error) {
      throw wrapPortfolioApiError("Failed to download file.", "storage", error);
    }
  },

  /**
   * Delete a file.
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async delete(file: PortfolioFile): Promise<void> {
    try {
      const user = await requireAuthenticatedUser();

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([file.storagePath]);

      if (storageError) {
        throw wrapPortfolioApiError(
          "Failed to delete file from storage.",
          "storage",
          storageError,
        );
      }

      const { error: dbError } = await supabase
        .from("portfolio_files")
        .delete()
        .eq("id", file.id)
        .eq("user_id", user.id);

      if (dbError) {
        throw wrapPortfolioApiError(
          "Failed to delete file metadata.",
          "database",
          dbError,
        );
      }
    } catch (error) {
      throw wrapPortfolioApiError("Failed to delete file.", "database", error);
    }
  },

  /**
   * Rename a file (metadata only, storage path unchanged).
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async rename(fileId: string, newFilename: string): Promise<void> {
    try {
      const user = await requireAuthenticatedUser();

      const { error } = await supabase
        .from("portfolio_files")
        .update({
          original_filename: newFilename,
          updated_at: getISOTimestamp(),
        })
        .eq("id", fileId)
        .eq("user_id", user.id);

      if (error) {
        throw wrapPortfolioApiError(
          "Failed to rename file.",
          "database",
          error,
        );
      }
    } catch (error) {
      throw wrapPortfolioApiError("Failed to rename file.", "database", error);
    }
  },

  /**
   * Move a file to another portfolio.
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async move(fileId: string, toPortfolioId: string): Promise<void> {
    try {
      const user = await requireAuthenticatedUser();

      const { data: file, error: fetchError } = await supabase
        .from("portfolio_files")
        .select("*")
        .eq("id", fileId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        throw wrapPortfolioApiError(
          "Failed to load file before moving it.",
          "database",
          fetchError,
        );
      }

      const filename = file.storage_path.split("/").pop();
      const newStoragePath = `${user.id}/${toPortfolioId}/${filename}`;

      const { error: moveError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .move(file.storage_path, newStoragePath);

      if (moveError) {
        throw wrapPortfolioApiError(
          "Failed to move file in storage.",
          "storage",
          moveError,
        );
      }

      const { error: updateError } = await supabase
        .from("portfolio_files")
        .update({
          portfolio_id: toPortfolioId,
          storage_path: newStoragePath,
          updated_at: getISOTimestamp(),
        })
        .eq("id", fileId)
        .eq("user_id", user.id);

      if (updateError) {
        throw wrapPortfolioApiError(
          "Failed to update moved file metadata.",
          "database",
          updateError,
        );
      }
    } catch (error) {
      throw wrapPortfolioApiError("Failed to move file.", "database", error);
    }
  },
};
