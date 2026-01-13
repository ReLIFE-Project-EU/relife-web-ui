/**
 * File and input sanitization utilities.
 *
 * These utilities prevent path traversal attacks and ensure filenames
 * are safe for storage operations.
 */

/** Maximum allowed filename length after sanitization */
const MAX_FILENAME_LENGTH = 200;

/** Characters that are unsafe in storage paths (excluding control chars handled separately) */
const UNSAFE_CHARS_REGEX = /[<>:"|?*]/g;

/** Path separators that could be used for traversal */
const PATH_SEPARATOR_REGEX = /[/\\]/g;

/**
 * Remove control characters (ASCII 0-31) from a string.
 * These include null bytes, tabs, newlines, and other non-printable characters.
 */
function removeControlChars(str: string): string {
  let result = "";
  for (const char of str) {
    const code = char.charCodeAt(0);
    // Keep only printable ASCII and Unicode chars (code >= 32)
    if (code >= 32) {
      result += char;
    }
  }
  return result;
}

/**
 * Sanitize a filename for safe storage.
 *
 * Security measures:
 * - Removes path separators (/, \) to prevent directory traversal
 * - Removes null bytes and control characters
 * - Replaces unsafe characters with underscores
 * - Truncates to maximum length while preserving extension
 * - Ensures result is never empty
 *
 * @param filename - Original filename from user input
 * @returns Sanitized filename safe for storage paths
 */
export function sanitizeFilename(filename: string): string {
  // Start with the original filename
  let sanitized = filename;

  // Remove control characters (null bytes, etc.)
  sanitized = removeControlChars(sanitized);

  // Remove path separators - prevents ../etc/passwd attacks
  sanitized = sanitized.replace(PATH_SEPARATOR_REGEX, "_");

  // Replace other unsafe characters
  sanitized = sanitized.replace(UNSAFE_CHARS_REGEX, "_");

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

  // Collapse multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Ensure filename is not empty after sanitization
  if (!sanitized) {
    sanitized = "unnamed_file";
  }

  // Truncate while preserving extension
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const lastDot = sanitized.lastIndexOf(".");
    if (lastDot > 0 && lastDot > sanitized.length - 10) {
      // Has a reasonable extension
      const ext = sanitized.slice(lastDot);
      const name = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH);
    }
  }

  return sanitized;
}

/**
 * Build a safe storage path for a file.
 *
 * Constructs a path in the format: userId/portfolioId/fileId_sanitizedFilename
 *
 * @param userId - Authenticated user's ID
 * @param portfolioId - Target portfolio ID
 * @param fileId - Generated unique file ID (UUID)
 * @param originalFilename - User-provided filename (will be sanitized)
 * @returns Safe storage path string
 */
export function buildStoragePath(
  userId: string,
  portfolioId: string,
  fileId: string,
  originalFilename: string,
): string {
  const safeFilename = sanitizeFilename(originalFilename);
  return `${userId}/${portfolioId}/${fileId}_${safeFilename}`;
}
