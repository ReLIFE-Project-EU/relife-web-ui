import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
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
