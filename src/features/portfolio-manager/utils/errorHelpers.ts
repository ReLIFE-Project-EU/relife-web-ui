/**
 * Error handling utilities for portfolio manager hooks.
 */

import { APIError } from "../../../types/common";
import { AuthenticationError } from "./authHelpers";

/**
 * Normalize an unknown error to a user-friendly message string.
 *
 * Handles the common pattern of extracting error messages from catch blocks
 * where the error type is unknown.
 *
 * @param err - The caught error (unknown type from catch block)
 * @param fallbackMessage - Message to use if error cannot be parsed
 * @returns A user-friendly error message string
 */
export function normalizeErrorMessage(
  err: unknown,
  fallbackMessage: string,
): string {
  if (err instanceof AuthenticationError) {
    return "Please sign in to continue";
  }

  if (err instanceof APIError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallbackMessage;
}
