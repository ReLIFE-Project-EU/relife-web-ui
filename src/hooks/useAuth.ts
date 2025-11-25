import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../auth";
import type { KeycloakRole, UniversalUser } from "../types/common";

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check active session immediately
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to get session:", error);
        if (mounted) {
          setLoading(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return { session, loading };
}

interface WhoamiResponse {
  user: UniversalUser;
  keycloak_roles: KeycloakRole[];
  [key: string]: unknown;
}

// Type guard to validate if a Supabase user can be safely used as UniversalUser
function isValidUniversalUser(user: unknown): user is UniversalUser {
  if (!user || typeof user !== "object") {
    return false;
  }

  const u = user as Partial<UniversalUser>;

  // Check required fields
  if (typeof u.id !== "string" || !u.id) {
    return false;
  }

  // email can be null but if present must be a string
  if (u.email !== null && typeof u.email !== "string") {
    return false;
  }

  // user_metadata should be an object
  if (!u.user_metadata || typeof u.user_metadata !== "object") {
    return false;
  }

  // identities should be an array
  if (!Array.isArray(u.identities)) {
    return false;
  }

  return true;
}

export function useWhoami(session: Session | null) {
  // Since we are now deriving data directly from the session object (which is already loaded),
  // we can use useMemo to compute the values synchronously during render.
  // This avoids the "setState in useEffect" antipattern for derived state.

  const derivedData = useMemo(() => {
    if (!session?.user) {
      return {
        whoami: null,
        fullName: null,
        roles: null,
      };
    }

    const user = session.user;

    // Validate user structure before using it
    if (!isValidUniversalUser(user)) {
      console.error(
        "User object does not match UniversalUser structure:",
        user,
      );
      return {
        whoami: null,
        fullName: null,
        roles: null,
      };
    }

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      (meta?.full_name as string) || (meta?.name as string) || null;

    // Roles logic placeholder
    const roles: KeycloakRole[] = [];

    const whoami: WhoamiResponse = {
      user,
      keycloak_roles: roles,
    };

    return { whoami, fullName, roles };
  }, [session]);

  // We can consider 'loading' to be false because the transformation is instant
  // once the session is provided. The parent component handles the session loading state.
  return { ...derivedData, error: null, loading: false };
}
