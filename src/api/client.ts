import { supabase } from "../auth";
import { startHttpRequestTracking } from "../contexts/global-loading/httpLoadingStore";
import { isLongRunningRequest } from "../contexts/global-loading/longRunningRequestConfig";
import type {
  AuthenticatedUser,
  FileUploadResponse,
  HealthResponse,
  StorageFileInfo,
  TableDataResponse,
} from "../types/common";
import { APIError, ServiceType } from "../types/common";
import { auditLog } from "../utils/auditLogger";

const API_BASE = "/api";

/**
 * Options for {@link request}. Extends the standard `RequestInit` with an opt-in
 * flag to suppress the global loading overlay for this call only — used for
 * non-critical background work (e.g. cost estimation) that should not block the
 * page. Default behavior (omitted/false) is unchanged for every existing caller.
 */
export interface RequestOptions extends RequestInit {
  skipGlobalLoading?: boolean;
}

function startTrackedHttpRequest(method: string, path: string): () => void {
  if (!isLongRunningRequest(method, path)) {
    return () => {};
  }
  return startHttpRequestTracking({ method, path });
}

// ============================================================================
// Core Request Functions
// ============================================================================

async function getAuthToken(forceRefresh = false): Promise<string | null> {
  try {
    if (forceRefresh) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Failed to refresh authentication session:", error);
        return null;
      }
      return data.session?.access_token ?? null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get authentication session:", error);
    return null;
  }
}

/**
 * Perform an authenticated fetch, retrying once on a 401 after forcing a
 * Supabase token refresh. Recovers from an expired access token mid-session
 * without surfacing a spurious auth error. supabase-js serializes concurrent
 * refreshes internally, so parallel 401s share a single in-flight refresh.
 */
async function fetchWithAuth(
  path: string,
  init: RequestInit,
  baseHeaders: Record<string, string>,
): Promise<Response> {
  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const token = await getAuthToken(forceRefresh);
    const headers: Record<string, string> = { ...baseHeaders };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (!forceRefresh) {
      console.warn("No auth token available for API request.");
    }

    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };

  const response = await attempt(false);
  if (response.status !== 401) {
    return response;
  }

  auditLog.warn("api", "api.auth.retry", {
    method: init.method ?? "GET",
    path,
  });
  return attempt(true);
}

export async function request<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  // Strip the custom flag so it never reaches fetch's RequestInit.
  const { skipGlobalLoading, ...init } = options ?? {};
  const method = init.method || "GET";
  const stopTracking = skipGlobalLoading
    ? () => {}
    : startTrackedHttpRequest(method, path);

  try {
    const response = await fetchWithAuth(
      path,
      { ...init, method },
      {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
      },
    );

    if (!response.ok) {
      let validationErrors;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          validationErrors = await response.json();
        }
      } catch {
        // No JSON body or parsing failed
      }

      auditLog.error("api", "api.error", {
        method,
        path,
        status: response.status,
        statusText: response.statusText,
        validationErrors,
      });
      throw new APIError(
        response.status,
        response.statusText,
        validationErrors,
      );
    }

    return response.json();
  } finally {
    stopTracking();
  }
}

export async function uploadRequest<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const method = "POST";
  const stopTracking = startTrackedHttpRequest(method, path);

  try {
    const response = await fetchWithAuth(
      path,
      { method: "POST", body: formData },
      {},
    );

    if (!response.ok) {
      let validationErrors;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          validationErrors = await response.json();
        }
      } catch {
        // No JSON body or parsing failed
      }

      auditLog.error("api", "api.error", {
        method,
        path,
        status: response.status,
        statusText: response.statusText,
        validationErrors,
      });
      throw new APIError(
        response.status,
        response.statusText,
        validationErrors,
      );
    }

    return response.json();
  } finally {
    stopTracking();
  }
}

export async function downloadRequest(path: string): Promise<Blob> {
  const method = "GET";
  const stopTracking = startTrackedHttpRequest(method, path);

  try {
    const response = await fetchWithAuth(path, {}, {});

    if (!response.ok) {
      throw new APIError(response.status, response.statusText);
    }

    return response.blob();
  } finally {
    stopTracking();
  }
}

// ============================================================================
// Common Endpoints Helper
// ============================================================================

export const createServiceApi = (service: ServiceType) => ({
  health: () => request<HealthResponse>(`/${service}/health`),

  whoami: () => request<AuthenticatedUser>(`/${service}/whoami`),

  storage: {
    list: () => request<StorageFileInfo[]>(`/${service}/storage`),

    upload: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadRequest<FileUploadResponse>(`/${service}/storage`, formData);
    },
  },

  readTable: (tableName: string) =>
    request<TableDataResponse>(
      `/${service}/table/${encodeURIComponent(tableName)}`,
    ),

  getUserProfile: () =>
    request<Record<string, unknown>>(`/${service}/user-profile`),
});
