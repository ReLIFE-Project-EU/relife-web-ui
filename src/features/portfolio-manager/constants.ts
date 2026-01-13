/**
 * Constants for the Portfolio Manager feature.
 * Defines file upload limits and storage configuration.
 */

export const FILE_UPLOAD_CONFIG = {
  ALLOWED_MIME_TYPES: ["text/csv"],
  ALLOWED_EXTENSIONS: [".csv"],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  DEFAULT_QUOTA: 500 * 1024 * 1024, // 500MB
} as const;

export const STORAGE_BUCKET = "portfolio-files";

/**
 * Human-readable file type labels
 */
export const FILE_TYPE_LABELS: Record<string, string> = {
  "text/csv": "CSV",
};

/**
 * Get file type label from MIME type
 */
export function getFileTypeLabel(mimeType: string): string {
  return FILE_TYPE_LABELS[mimeType] ?? "Unknown";
}
