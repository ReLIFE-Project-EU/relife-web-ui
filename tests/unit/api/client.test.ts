import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockGetSession,
  mockRefreshSession,
  mockStopTracking,
  mockStartTracking,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockStopTracking: vi.fn(),
  mockStartTracking: vi.fn(),
}));

vi.mock("../../../src/auth", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  },
}));

vi.mock("../../../src/contexts/global-loading/httpLoadingStore", () => ({
  startHttpRequestTracking: mockStartTracking,
}));

vi.mock(
  "../../../src/contexts/global-loading/longRunningRequestConfig",
  () => ({
    isLongRunningRequest: () => true,
  }),
);

import { request, uploadRequest } from "../../../src/api/client";
import { auditLog } from "../../../src/utils/auditLogger";
import { APIError } from "../../../src/types/common";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? "Unauthorized" : "OK",
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockStartTracking.mockReturnValue(mockStopTracking);
  vi.stubGlobal("fetch", mockFetch);
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "old-token" } },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request auth retry", () => {
  test("refreshes the session and retries once on a 401, then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { value: 42 }));
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: "new-token" } },
      error: null,
    });
    const warnSpy = vi.spyOn(auditLog, "warn");

    const result = await request<{ value: number }>("/financial/health");

    expect(result).toEqual({ value: 42 });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstHeaders = mockFetch.mock.calls[0][1].headers;
    const secondHeaders = mockFetch.mock.calls[1][1].headers;
    expect(firstHeaders.Authorization).toBe("Bearer old-token");
    expect(secondHeaders.Authorization).toBe("Bearer new-token");
    expect(warnSpy).toHaveBeenCalledWith(
      "api",
      "api.auth.retry",
      expect.objectContaining({ path: "/financial/health" }),
    );
  });

  test("throws APIError when the refreshed token still 401s", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "still expired" }));
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh token expired" },
    });
    const errorSpy = vi.spyOn(auditLog, "error");

    const error = await request("/financial/health").catch((e) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ status: 401 });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      "api",
      "api.error",
      expect.objectContaining({ status: 401 }),
    );
  });

  test("does not refresh when the first attempt succeeds", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { value: 1 }));

    const result = await request<{ value: number }>("/financial/health");

    expect(result).toEqual({ value: 1 });
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

const calls = [
  { name: "JSON", run: () => request("/test", { method: "POST" }) },
  { name: "upload", run: () => uploadRequest("/test", new FormData()) },
];

describe.each(calls)("$name failures", ({ run }) => {
  test.each([
    {
      body: JSON.stringify({
        detail: [{ loc: ["body", "area"], msg: "Required", type: "missing" }],
      }),
      contentType: "application/json",
    },
    {
      body: JSON.stringify({ detail: "Invalid input" }),
      contentType: "application/json",
    },
    { body: "upstream unavailable", contentType: "text/plain" },
    { body: "{broken", contentType: "application/json" },
  ])(
    "preserves error details and releases loading: $body",
    async ({ body, contentType }) => {
      mockFetch.mockResolvedValue(
        new Response(body, {
          status: 422,
          statusText: "Unprocessable Entity",
          headers: { "Content-Type": contentType },
        }),
      );
      const errorSpy = vi.spyOn(auditLog, "error");
      const error: unknown = await run().catch((error: unknown) => error);
      expect(error).toBeInstanceOf(APIError);
      expect(error).toMatchObject({
        status: 422,
        statusText: "Unprocessable Entity",
      });
      expect(error instanceof APIError && error.validationErrors).toEqual(
        body.startsWith('{"detail"') ? JSON.parse(body) : undefined,
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockStopTracking).toHaveBeenCalledTimes(1);
    },
  );

  test("releases loading when fetch rejects", async () => {
    const failure = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(failure);
    await expect(run()).rejects.toBe(failure);
    expect(mockStopTracking).toHaveBeenCalledTimes(1);
  });
});

test("upload retries with the same multipart body without a JSON content type", async () => {
  const body = new FormData();
  body.append("file", new Blob(["data"]), "test.txt");
  mockFetch
    .mockResolvedValueOnce(jsonResponse(401, {}))
    .mockResolvedValueOnce(jsonResponse(200, { uploaded: true }));
  mockRefreshSession.mockResolvedValue({
    data: { session: { access_token: "new-token" } },
  });
  await expect(uploadRequest("/test", body)).resolves.toEqual({
    uploaded: true,
  });
  for (const [, init] of mockFetch.mock.calls) {
    expect(init.body).toBe(body);
    expect(init.headers["Content-Type"]).toBeUndefined();
  }
  expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe(
    "Bearer new-token",
  );
  expect(mockStopTracking).toHaveBeenCalledTimes(1);
});

test("skipGlobalLoading suppresses tracking even on failure", async () => {
  mockFetch.mockResolvedValue(jsonResponse(500, {}));
  await expect(
    request("/test", { skipGlobalLoading: true }),
  ).rejects.toBeInstanceOf(APIError);
  expect(mockStartTracking).not.toHaveBeenCalled();
  expect(mockStopTracking).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls[0][1]).not.toHaveProperty("skipGlobalLoading");
});
