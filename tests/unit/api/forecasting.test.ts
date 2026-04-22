import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockUploadRequest } = vi.hoisted(() => ({
  mockUploadRequest: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  createServiceApi: () => ({}),
  downloadRequest: vi.fn(),
  request: vi.fn(),
  uploadRequest: mockUploadRequest,
}));

import { forecasting } from "../../../src/api/forecasting";

function getSearchParams(): URLSearchParams {
  const path = mockUploadRequest.mock.calls[0]?.[0];
  if (typeof path !== "string") {
    throw new Error("uploadRequest was not called with a path");
  }

  return new URL(path, "http://localhost").searchParams;
}

describe("forecasting.simulateECM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadRequest.mockResolvedValue({ scenarios: [] });
  });

  test("serializes envelope-only params without PV or include_baseline", async () => {
    await forecasting.simulateECM({
      category: "SFH",
      country: "Greece",
      name: "GR_SFH",
      scenario_elements: "wall",
      u_wall: 0.25,
    });

    const params = getSearchParams();
    expect(params.get("scenario_elements")).toBe("wall");
    expect(params.get("u_wall")).toBe("0.25");
    expect(params.has("use_pv")).toBe(false);
    expect(params.has("pv_kwp")).toBe(false);
    expect(params.has("include_baseline")).toBe(false);
  });

  test("serializes PV params with envelope elements and no pv element token", async () => {
    await forecasting.simulateECM({
      category: "SFH",
      country: "Greece",
      name: "GR_SFH",
      scenario_elements: "wall,roof",
      u_wall: 0.25,
      u_roof: 0.2,
      use_pv: true,
      pv_kwp: 4.5,
      pv_tilt_deg: 30,
      pv_azimuth_deg: 0,
      pv_use_pvgis: true,
      pv_pvgis_loss_percent: 14,
      annual_pv_yield_kwh_per_kwp: 1400,
    });

    const params = getSearchParams();
    expect(params.get("scenario_elements")).toBe("wall,roof");
    expect(params.get("scenario_elements")).not.toContain("pv");
    expect(params.get("use_pv")).toBe("true");
    expect(params.get("pv_kwp")).toBe("4.5");
    expect(params.get("pv_tilt_deg")).toBe("30");
    expect(params.get("pv_azimuth_deg")).toBe("0");
    expect(params.get("pv_use_pvgis")).toBe("true");
    expect(params.get("pv_pvgis_loss_percent")).toBe("14");
    expect(params.get("annual_pv_yield_kwh_per_kwp")).toBe("1400");
    expect(params.has("include_baseline")).toBe(false);
  });

  test("serializes PV-only params without scenario_elements or include_baseline", async () => {
    await forecasting.simulateECM({
      category: "SFH",
      country: "Greece",
      name: "GR_SFH",
      use_pv: true,
      pv_kwp: 3,
      pv_tilt_deg: 30,
    });

    const params = getSearchParams();
    expect(params.get("use_pv")).toBe("true");
    expect(params.get("pv_kwp")).toBe("3");
    expect(params.has("scenario_elements")).toBe(false);
    expect(params.has("include_baseline")).toBe(false);
  });

  test("serializes heat-pump-only params with include_baseline", async () => {
    await forecasting.simulateECM({
      category: "SFH",
      country: "Greece",
      name: "GR_SFH",
      use_heat_pump: true,
      heat_pump_cop: 3.2,
      include_baseline: true,
    });

    const params = getSearchParams();
    expect(params.get("use_heat_pump")).toBe("true");
    expect(params.get("heat_pump_cop")).toBe("3.2");
    expect(params.get("include_baseline")).toBe("true");
  });
});
