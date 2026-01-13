/**
 * Authentication helper utilities for portfolio API operations.
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../auth";

/**
 * Custom error for authentication failures.
 * Provides a consistent error type that can be checked with instanceof.
 */
export class AuthenticationError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthenticationError";
    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Get the current authenticated user or throw an AuthenticationError.
 * Use this for operations that require authentication.
 *
 * @throws {AuthenticationError} If no user is authenticated
 * @returns The authenticated Supabase User object
 */
export async function requireAuthenticatedUser(): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthenticationError();
  }

  return user;
}
