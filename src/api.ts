const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
}

export const api = {
  // Financial service endpoints
  financial: {
    ping: () => request<OpenAPISpec>("/financial/openapi.json"),
    get: <T>(path: string) => request<T>(`/financial${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/financial${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Technical service endpoints
  technical: {
    ping: () => request<OpenAPISpec>("/technical/openapi.json"),
    get: <T>(path: string) => request<T>(`/technical${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/technical${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Forecasting service endpoints
  forecasting: {
    ping: () => request<OpenAPISpec>("/forecasting/openapi.json"),
    get: <T>(path: string) => request<T>(`/forecasting${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/forecasting${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
