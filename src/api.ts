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

export const api = {
  // Service 1 endpoints
  service1: {
    get: <T>(path: string) => request<T>(`/service1${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/service1${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Service 2 endpoints
  service2: {
    get: <T>(path: string) => request<T>(`/service2${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/service2${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Service 3 endpoints
  service3: {
    get: <T>(path: string) => request<T>(`/service3${path}`),
    post: <T>(path: string, data: unknown) =>
      request<T>(`/service3${path}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
