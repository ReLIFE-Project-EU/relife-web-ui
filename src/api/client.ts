import { supabase } from "../auth";
import type {
  AuthenticatedUser,
  FileUploadResponse,
  HealthResponse,
  StorageFileInfo,
  TableDataResponse,
} from "../types/common";
import { APIError, ServiceType } from "../types/common";

const API_BASE = "/api";

// ============================================================================
// Core Request Functions
// ============================================================================

async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get authentication session:", error);
    return null;
  }
}

export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("No auth token available for request to", path);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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

    console.error(`API Error ${response.status} for ${path}`, validationErrors);
    throw new APIError(response.status, response.statusText, validationErrors);
  }

  return response.json();
}

export async function uploadRequest<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers,
  });

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

    throw new APIError(response.status, response.statusText, validationErrors);
  }

  return response.json();
}

export async function downloadRequest(path: string): Promise<Blob> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.blob();
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
