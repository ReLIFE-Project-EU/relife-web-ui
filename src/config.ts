/**
 * Central configuration file for the application
 * All environment variables and configuration settings are defined here
 */

import type { SupabaseClientOptions } from "@supabase/supabase-js";

// Validate required environment variables
const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL) {
  throw new Error(
    "Missing required environment variable: VITE_SUPABASE_URL. Please check your .env file.",
  );
}

if (!VITE_SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variable: VITE_SUPABASE_ANON_KEY. Please check your .env file.",
  );
}

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: VITE_SUPABASE_URL,
  anonKey: VITE_SUPABASE_ANON_KEY,
};

// Keycloak Configuration
export const KEYCLOAK_CONFIG = {
  url: import.meta.env.VITE_KEYCLOAK_URL || "",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
};

// API Configuration
export const API_CONFIG = {
  url: import.meta.env.VITE_API_URL || "/api",
};

// App Configuration
export const APP_CONFIG = {
  name: "ReLIFE Web UI",
  description: "ReLIFE Platform Web Interface",
};

// Build helper functions for generating URLs and other derived config values
export function getKeycloakLogoutUrl(): string | undefined {
  const { url, realm, clientId } = KEYCLOAK_CONFIG;

  // Guard against SSR - only access window in browser environment
  const redirectUri =
    typeof window !== "undefined" ? window.location.origin : undefined;

  if (!url || !realm || !clientId) {
    console.warn("Keycloak URL, realm, or client ID not configured.");
    return undefined;
  }

  const logoutUrl = new URL(
    `${url}/realms/${realm}/protocol/openid-connect/logout`,
  );

  logoutUrl.searchParams.append("client_id", clientId);

  // Only append redirect URI if we have one (i.e., in browser)
  if (redirectUri) {
    logoutUrl.searchParams.append("post_logout_redirect_uri", redirectUri);
  }

  return logoutUrl.toString();
}

// Create and export the Supabase client configuration
export const SUPABASE_CLIENT_CONFIG: SupabaseClientOptions<string> = {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};
