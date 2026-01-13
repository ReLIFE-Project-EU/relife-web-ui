/**
 * File API - Upload, download, and manage portfolio files.
 */

import { supabase } from "../../../auth";
import { FILE_UPLOAD_CONFIG, STORAGE_BUCKET } from "../constants";
import type { PortfolioFile, PortfolioFileRow } from "../types";
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
   * List all files in a portfolio
   */
  async listByPortfolio(portfolioId: string): Promise<PortfolioFile[]> {
    const { data, error } = await supabase
      .from("portfolio_files")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as PortfolioFileRow[]).map(toPortfolioFile);
  },

  /**
   * Upload a file to a portfolio
   */
  async upload(portfolioId: string, file: File): Promise<PortfolioFile> {
    // Validate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

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

    // Generate unique storage path
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/${portfolioId}/${fileId}_${file.name}`;

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
   * Delete a file
   */
  async delete(file: PortfolioFile): Promise<void> {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([file.storagePath]);

    if (storageError) throw storageError;

    // Delete database record
    const { error: dbError } = await supabase
      .from("portfolio_files")
      .delete()
      .eq("id", file.id);

    if (dbError) throw dbError;
  },

  /**
   * Rename a file (metadata only, storage path unchanged)
   */
  async rename(fileId: string, newFilename: string): Promise<void> {
    const { error } = await supabase
      .from("portfolio_files")
      .update({
        original_filename: newFilename,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    if (error) throw error;
  },

  /**
   * Move a file to another portfolio
   */
  async move(fileId: string, toPortfolioId: string): Promise<void> {
    // Get current file info
    const { data: file, error: fetchError } = await supabase
      .from("portfolio_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fetchError) throw fetchError;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Calculate new storage path
    const filename = file.storage_path.split("/").pop();
    const newStoragePath = `${user.id}/${toPortfolioId}/${filename}`;

    // Move file in storage
    const { error: moveError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .move(file.storage_path, newStoragePath);

    if (moveError) throw moveError;

    // Update database record
    const { error: updateError } = await supabase
      .from("portfolio_files")
      .update({
        portfolio_id: toPortfolioId,
        storage_path: newStoragePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    if (updateError) throw updateError;
  },
};
