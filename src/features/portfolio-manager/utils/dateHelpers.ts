/**
 * Date and timestamp utilities.
 */

/**
 * Get the current timestamp in ISO 8601 format.
 *
 * Use this for consistent timestamp generation across the feature,
 * particularly for updated_at fields in database operations.
 *
 * @returns Current time as ISO 8601 string (e.g., "2024-01-15T10:30:00.000Z")
 */
export function getISOTimestamp(): string {
  return new Date().toISOString();
}
