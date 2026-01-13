/**
 * File API - Upload, download, and manage portfolio files.
 */

import { supabase } from "../../../auth";
import { FILE_UPLOAD_CONFIG, STORAGE_BUCKET } from "../constants";
import type { PortfolioFile, PortfolioFileRow } from "../types";
import {
  requireAuthenticatedUser,
  buildStoragePath,
  getISOTimestamp,
} from "../utils";
import { quotaApi } from "./quotaApi";

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
    const user = await requireAuthenticatedUser();

    const { data, error } = await supabase
      .from("portfolio_files")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as PortfolioFileRow[]).map(toPortfolioFile);
  },

  /**
   * Upload a file to a portfolio.
   * Uses sanitized filename to prevent path traversal attacks.
   */
  async upload(portfolioId: string, file: File): Promise<PortfolioFile> {
    const user = await requireAuthenticatedUser();

    // Validate file type
    if (
      !FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(
        file.type as (typeof FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new Error(`File type not allowed: ${file.type}`);
    }

    // Validate file size
    if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      throw new Error("File exceeds maximum size of 50MB");
    }

    // Check quota
    const hasQuota = await quotaApi.checkUploadAllowed(file.size);
    if (!hasQuota) {
      throw new Error("Storage quota exceeded");
    }

    // Generate unique storage path with sanitized filename
    const fileId = crypto.randomUUID();
    const storagePath = buildStoragePath(
      user.id,
      portfolioId,
      fileId,
      file.name,
    );

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create database record
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
      // Rollback storage upload on DB failure
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw dbError;
    }

    return toPortfolioFile(data as PortfolioFileRow);
  },

  /**
   * Download a file
   */
  async download(file: PortfolioFile): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(file.storagePath);

    if (error) throw error;
    return data;
  },

  /**
   * Delete a file.
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async delete(file: PortfolioFile): Promise<void> {
    const user = await requireAuthenticatedUser();

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([file.storagePath]);

    if (storageError) throw storageError;

    // Delete database record (scoped by user)
    const { error: dbError } = await supabase
      .from("portfolio_files")
      .delete()
      .eq("id", file.id)
      .eq("user_id", user.id);

    if (dbError) throw dbError;
  },

  /**
   * Rename a file (metadata only, storage path unchanged).
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async rename(fileId: string, newFilename: string): Promise<void> {
    const user = await requireAuthenticatedUser();

    const { error } = await supabase
      .from("portfolio_files")
      .update({
        original_filename: newFilename,
        updated_at: getISOTimestamp(),
      })
      .eq("id", fileId)
      .eq("user_id", user.id);

    if (error) throw error;
  },

  /**
   * Move a file to another portfolio.
   * Defense-in-depth: scopes by user_id to prevent unauthorized access.
   */
  async move(fileId: string, toPortfolioId: string): Promise<void> {
    const user = await requireAuthenticatedUser();

    // Get current file info (scoped by user)
    const { data: file, error: fetchError } = await supabase
      .from("portfolio_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new storage path
    const filename = file.storage_path.split("/").pop();
    const newStoragePath = `${user.id}/${toPortfolioId}/${filename}`;

    // Move file in storage
    const { error: moveError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .move(file.storage_path, newStoragePath);

    if (moveError) throw moveError;

    // Update database record (scoped by user)
    const { error: updateError } = await supabase
      .from("portfolio_files")
      .update({
        portfolio_id: toPortfolioId,
        storage_path: newStoragePath,
        updated_at: getISOTimestamp(),
      })
      .eq("id", fileId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;
  },
};
