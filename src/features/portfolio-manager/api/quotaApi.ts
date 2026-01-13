/**
 * Quota API - Storage quota management.
 */

import { supabase } from "../../../auth";
import { FILE_UPLOAD_CONFIG } from "../constants";
import type { StorageQuota } from "../types";
import { requireAuthenticatedUser } from "../utils";

export const quotaApi = {
  /**
   * Get current storage quota for the user
   */
  async get(): Promise<StorageQuota> {
    const user = await requireAuthenticatedUser();

    const { data, error } = await supabase
      .from("user_storage_quotas")
      .select("used_bytes, max_bytes")
      .eq("user_id", user.id)
      .single();

    // PGRST116 = no rows found, which is OK for new users
    if (error && error.code !== "PGRST116") throw error;

    const usedBytes = data?.used_bytes ?? 0;
    const maxBytes = data?.max_bytes ?? FILE_UPLOAD_CONFIG.DEFAULT_QUOTA;

    return {
      usedBytes,
      maxBytes,
      usedPercentage: maxBytes > 0 ? (usedBytes / maxBytes) * 100 : 0,
    };
  },

  /**
   * Check if uploading a file of given size would exceed quota
   */
  async checkUploadAllowed(fileSize: number): Promise<boolean> {
    const quota = await this.get();
    return quota.usedBytes + fileSize <= quota.maxBytes;
  },
};
