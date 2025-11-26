import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  API_CONFIG,
  KEYCLOAK_CONFIG,
  SUPABASE_CLIENT_CONFIG,
  SUPABASE_CONFIG,
  getKeycloakLogoutUrl,
} from "./config";

export { getKeycloakLogoutUrl };

// Create Supabase client using centralized configuration
export function getClient() {
  return createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey,
    SUPABASE_CLIENT_CONFIG,
  );
}

// Helper functions to access configuration values
export function getSupabaseUrl(): string {
  return SUPABASE_CONFIG.url;
}

export function getServiceApiUrl(): string {
  return API_CONFIG.url;
}

export function getKeycloakUrl(): string {
  return KEYCLOAK_CONFIG.url;
}

export function getKeycloakRealm(): string {
  return KEYCLOAK_CONFIG.realm;
}

export function getKeycloakClientId(): string {
  return KEYCLOAK_CONFIG.clientId;
}

export async function signInWithKeycloak(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>;
  redirectTo?: string;
}) {
  const { supabase, redirectTo } = params;
  return supabase.auth.signInWithOAuth({
    provider: "keycloak",
    options: {
      scopes: "openid",
      redirectTo: redirectTo ?? window.location.origin,
    },
  });
}

export const supabase = getClient();
