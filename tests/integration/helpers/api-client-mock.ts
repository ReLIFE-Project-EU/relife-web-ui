/**
 * API Client Mock Helper for Integration Tests
 *
 * Provides a reusable vi.mock setup for redirecting src/api/client calls
 * to the integration test backend and recording HTTP exchanges.
 *
 * Usage:
 *   const httpHistory: HttpExchange[] = [];
 *   setupApiClientMock(httpHistory);
 */

import { APIError } from "../../../src/types/common";

/**
 * HTTP exchange record for tracing
 */
export interface HttpExchange {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    timestamp: string;
  };
  response: {
    status: number;
    body: unknown;
  };
}

/**
 * Configuration for the API client mock
 */
export interface ApiClientMockOptions {
  /** Base URL for the API (default: process.env.INTEGRATION_API_BASE or localhost) */
  baseURL?: string;
  /** Auth token (default: process.env.INTEGRATION_AUTH_TOKEN) */
  authToken?: string;
}

export function requestsTo(
  httpHistory: HttpExchange[],
  pathFragment: string,
): HttpExchange[] {
  return httpHistory.filter((exchange) =>
    exchange.request.url.includes(pathFragment),
  );
}

export function findRequest(
  httpHistory: HttpExchange[],
  pathFragment: string,
  predicate: (url: URL, exchange: HttpExchange) => boolean,
): HttpExchange | undefined {
  return requestsTo(httpHistory, pathFragment).find((exchange) =>
    predicate(new URL(exchange.request.url), exchange),
  );
}

export function lastRequest(
  httpHistory: HttpExchange[],
  pathFragment: string,
): HttpExchange | undefined {
  const matches = requestsTo(httpHistory, pathFragment);
  return matches[matches.length - 1];
}

/**
 * Get base URL from env var with fallback
 */
export function getBaseURL(customBaseURL?: string): string {
  return (
    customBaseURL ??
    process.env.INTEGRATION_API_BASE ??
    "http://localhost:8080/api"
  );
}

/**
 * Get auth token from env var
 */
export function getAuthToken(customToken?: string): string {
  return customToken ?? process.env.INTEGRATION_AUTH_TOKEN ?? "";
}

/**
 * Setup API client mock for integration tests
 *
 * This function configures vi.mock to intercept all calls to src/api/client
 * and redirect them to the integration test backend while recording exchanges.
 *
 * @param httpHistory - Array to record HTTP exchanges (must be passed from test file)
 * @param options - Optional configuration for base URL and auth token
 *
 * @example
 * ```typescript
 * const httpHistory: HttpExchange[] = [];
 *
 * vi.mock("../../src/api/client", async (importOriginal) => {
 *   return setupApiClientMock(httpHistory, importOriginal);
 * });
 * ```
 */
export async function setupApiClientMock(
  httpHistory: HttpExchange[],
  importOriginal?: () => Promise<unknown>,
  options?: ApiClientMockOptions,
) {
  const baseURL = getBaseURL(options?.baseURL);
  const authToken = getAuthToken(options?.authToken);

  // If importOriginal not provided, create a minimal mock
  if (!importOriginal) {
    // Create a no-op original for the mock
    importOriginal = async () => ({});
  }

  const original = await importOriginal();

  /**
   * Custom request function with tracing
   */
  const request = async <T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> => {
    const url = `${baseURL}${path}`;
    const method = options?.method || "GET";

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Execute request
    const timestamp = new Date().toISOString();

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseBody = await response.text();
    const isJSON = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body =
      isJSON && responseBody ? JSON.parse(responseBody) : responseBody;

    // Record exchange
    httpHistory.push({
      request: {
        method,
        url,
        headers,
        body: options?.body
          ? typeof options.body === "string"
            ? JSON.parse(options.body as string)
            : options.body
          : undefined,
        timestamp,
      },
      response: {
        status: response.status,
        body,
      },
    });

    // Throw APIError for non-2xx
    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText,
        body as
          | import("../../../src/types/common").HTTPValidationError
          | undefined,
      );
    }

    return body as T;
  };

  /**
   * Custom uploadRequest for FormData endpoints
   */
  const uploadRequest = async <T>(
    path: string,
    formData: FormData,
  ): Promise<T> => {
    const url = `${baseURL}${path}`;

    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    // Note: Do NOT set Content-Type for FormData; browser sets it automatically with boundary

    const timestamp = new Date().toISOString();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const responseBody = await response.text();
    const isJSON = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body =
      isJSON && responseBody ? JSON.parse(responseBody) : responseBody;

    // Record exchange (FormData body cannot be logged directly)
    httpHistory.push({
      request: {
        method: "POST",
        url,
        headers,
        body: "[FormData]",
        timestamp,
      },
      response: {
        status: response.status,
        body,
      },
    });

    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText || `HTTP ${response.status} from POST ${path}`,
        body as
          | import("../../../src/types/common").HTTPValidationError
          | undefined,
      );
    }

    return body as T;
  };

  /**
   * Custom downloadRequest (not commonly used in integration tests)
   */
  const downloadRequest = async (): Promise<Blob> => {
    throw new Error("downloadRequest not implemented in integration test mock");
  };

  /**
   * Factory function for API service clients
   */
  const createServiceApi = (serviceName: string) => {
    return {
      health: () => request(`/${serviceName}/health`),
      whoami: () => request(`/${serviceName}/whoami`),
      storage: {
        list: () => request(`/${serviceName}/storage`),
        upload: (file: File) => {
          const formData = new FormData();
          formData.append("file", file);
          return uploadRequest(`/${serviceName}/storage`, formData);
        },
      },
      readTable: (tableName: string) =>
        request(`/${serviceName}/table/${encodeURIComponent(tableName)}`),
      getUserProfile: () => request(`/${serviceName}/user-profile`),
    };
  };

  return {
    ...(original as Record<string, unknown>),
    request,
    uploadRequest,
    downloadRequest,
    createServiceApi,
  };
}
