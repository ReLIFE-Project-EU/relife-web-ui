import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
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
  startHttpRequestTracking: () => () => {},
}));

vi.mock(
  "../../../src/contexts/global-loading/longRunningRequestConfig",
  () => ({
    isLongRunningRequest: () => false,
  }),
);

import { request } from "../../../src/api/client";
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
