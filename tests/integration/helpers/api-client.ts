/**
 * Integration test API client
 *
 * Thin wrapper over fetch() for direct HTTP calls to backend services.
 * Does NOT import any app code (no Vite, no Supabase, no React dependencies).
 */

interface APIResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

interface RequestRecord {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: string;
}

interface ResponseRecord {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  timestamp: string;
}

// Request/response recording for context reporting
const requestHistory: Array<{
  request: RequestRecord;
  response: ResponseRecord;
}> = [];

/**
 * Get base URL from env var with fallback
 */
function getBaseURL(): string {
  return process.env.INTEGRATION_API_BASE || "http://localhost:8080/api";
}

/**
 * Get optional auth token from env var
 */
function getAuthToken(): string | null {
  return process.env.INTEGRATION_AUTH_TOKEN || null;
}

/**
 * Generic fetch wrapper with recording
 */
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<APIResponse<T>> {
  const baseURL = getBaseURL();
  const url = `${baseURL}${path}`;
  const authToken = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Record request
  const requestRecord: RequestRecord = {
    method: options.method || "GET",
    url,
    headers,
    body:
      options.body instanceof FormData
        ? "[FormData]"
        : options.body
          ? JSON.parse(options.body as string)
          : undefined,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  let body: unknown;

  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  // Record response
  const responseRecord: ResponseRecord = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    timestamp: new Date().toISOString(),
  };

  requestHistory.push({ request: requestRecord, response: responseRecord });

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: body as T,
  };
}

/**
 * GET request
 */
export async function get<T = unknown>(path: string): Promise<APIResponse<T>> {
  return apiFetch<T>(path, { method: "GET" });
}

/**
 * POST request with JSON body
 */
export async function post<T = unknown>(
  path: string,
  body: unknown,
): Promise<APIResponse<T>> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * POST request with FormData (multipart/form-data)
 * Note: Content-Type header is omitted to let the browser set it with boundary
 */
export async function postForm<T = unknown>(
  path: string,
  formData: FormData,
): Promise<APIResponse<T>> {
  return apiFetch<T>(path, {
    method: "POST",
    body: formData,
  });
}

/**
 * Get request history for context reporting
 */
export function getRequestHistory(): Array<{
  request: RequestRecord;
  response: ResponseRecord;
}> {
  return requestHistory;
}

/**
 * Clear request history (useful between tests)
 */
export function clearRequestHistory(): void {
  requestHistory.length = 0;
}
