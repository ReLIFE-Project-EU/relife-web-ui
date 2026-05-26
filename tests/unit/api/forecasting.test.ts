import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockRequest, mockUploadRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockUploadRequest: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  createServiceApi: () => ({}),
  downloadRequest: vi.fn(),
  request: mockRequest,
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

  test("serializes baseline-only params", async () => {
    await forecasting.simulateECM({
      category: "SFH",
      country: "Greece",
      name: "GR_SFH",
      baseline_only: true,
    });

    const params = getSearchParams();
    expect(params.get("baseline_only")).toBe("true");
    expect(params.has("include_baseline")).toBe(false);
    expect(params.has("scenario_elements")).toBe(false);
  });
});

describe("forecasting.getEmissionFactors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue({
      country: "EU",
      emission_factors_kg_co2eq_per_kwh: {},
      sources: [],
    });
  });

  test("GETs /forecasting/emission-factors with resolved country param", async () => {
    await forecasting.getEmissionFactors("DE");

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [path] = mockRequest.mock.calls[0];
    expect(path).toBe("/forecasting/emission-factors?country=DE");
  });

  test("rewrites unsupported archetype country to default before HTTP call", async () => {
    await forecasting.getEmissionFactors("Greece");

    const [path] = mockRequest.mock.calls[0];
    expect(path).toBe("/forecasting/emission-factors?country=EU");
  });
});

describe("forecasting.calculateEmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue({
      name: "test",
      energy_source: "natural_gas",
      annual_consumption_kwh: 100,
      emission_factor_kg_per_kwh: 0.2,
      annual_emissions_kg_co2eq: 20,
      annual_emissions_ton_co2eq: 0.02,
      equivalent_trees: 1,
      equivalent_km_car: 167,
    });
  });

  test("POSTs to /forecasting/calculate with JSON body", async () => {
    const input = {
      name: "baseline:thermal",
      energy_source: "natural_gas",
      annual_consumption_kwh: 1_000,
      country: "IT",
    };

    await forecasting.calculateEmissions(input);

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [path, options] = mockRequest.mock.calls[0];
    expect(path).toBe("/forecasting/calculate");
    expect(options).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  });

  test("rewrites unsupported country in request body to default", async () => {
    const input = {
      name: "baseline:thermal",
      energy_source: "natural_gas",
      annual_consumption_kwh: 1_000,
      country: "Greece",
    };

    await forecasting.calculateEmissions(input);

    const [, options] = mockRequest.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.country).toBe("EU");
    expect(body.name).toBe("baseline:thermal");
  });
});

describe("forecasting.compareEmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue({
      baseline: {} as unknown,
      scenarios: [],
      best_scenario: "",
      savings: [],
    });
  });

  test("POSTs to /forecasting/compare with JSON body", async () => {
    const req = {
      scenarios: [
        {
          name: "baseline",
          energy_source: "natural_gas",
          annual_consumption_kwh: 1_000,
          country: "IT",
        },
        {
          name: "renovated",
          energy_source: "natural_gas",
          annual_consumption_kwh: 500,
          country: "IT",
        },
      ],
    };

    await forecasting.compareEmissions(req);

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [path, options] = mockRequest.mock.calls[0];
    expect(path).toBe("/forecasting/compare");
    expect(options).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(req),
      }),
    );
  });

  test("rewrites unsupported country for every scenario in body", async () => {
    const req = {
      scenarios: [
        {
          name: "baseline",
          energy_source: "natural_gas",
          annual_consumption_kwh: 1_000,
          country: "Greece",
        },
        {
          name: "renovated",
          energy_source: "grid_electricity",
          annual_consumption_kwh: 500,
          country: "Spain",
        },
      ],
    };

    await forecasting.compareEmissions(req);

    const [, options] = mockRequest.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.scenarios[0].country).toBe("EU");
    expect(body.scenarios[1].country).toBe("EU");
  });
});
