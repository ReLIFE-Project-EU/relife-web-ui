/**
 * TypeScript interfaces for the Portfolio Manager feature.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioFile {
  id: string;
  portfolioId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Quota Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageQuota {
  usedBytes: number;
  maxBytes: number;
  usedPercentage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Progress Types
// ─────────────────────────────────────────────────────────────────────────────

export type UploadStatus = "pending" | "uploading" | "complete" | "error";

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Row Types (snake_case from Supabase)
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  portfolio_files: { count: number }[];
}

export interface PortfolioFileRow {
  id: string;
  portfolio_id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface StorageQuotaRow {
  user_id: string;
  used_bytes: number;
  max_bytes: number;
  updated_at: string;
}
